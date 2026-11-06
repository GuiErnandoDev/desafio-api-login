// auth.js - funções de segurança do login. Usa só o módulo "crypto" do Node (nada para instalar).
//   - hashSenha / verificarSenha: guardam a senha de forma segura (scrypt + sal aleatório)
//   - criarToken / verificarToken: geram e conferem o access_token no formato JWT (HS256)

const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);

// ---------- senha ----------
// A senha NUNCA é guardada no banco. Guardamos "scrypt$sal$hash".
// O sal (aleatório) faz duas pessoas com a mesma senha terem hashes diferentes.
async function hashSenha(senha, sal = crypto.randomBytes(16).toString('hex')) {
  const hash = (await scrypt(senha, sal, 64)).toString('hex');
  return `scrypt$${sal}$${hash}`;
}

async function verificarSenha(senha, armazenado) {
  const partes = typeof armazenado === 'string' ? armazenado.split('$') : [];
  if (partes.length !== 3 || partes[0] !== 'scrypt') return false;
  const [, sal, hash] = partes;
  const calculado = await scrypt(senha, sal, 64);
  const esperado = Buffer.from(hash, 'hex');
  // timingSafeEqual compara sem revelar, pelo tempo, em que posição os valores diferem
  return calculado.length === esperado.length && crypto.timingSafeEqual(calculado, esperado);
}

// ---------- token JWT ----------
// Um JWT tem 3 partes separadas por ponto: cabeçalho.dados.assinatura
//   cabeçalho  -> { alg: "HS256", typ: "JWT" }
//   dados      -> { sub, email, nome, iat (criado em), exp (expira em) }
//   assinatura -> HMAC-SHA256 das duas primeiras partes com o segredo do servidor
// Os dados são só codificados (qualquer um consegue ler); a assinatura é que impede alterar.
const codificar = (objeto) => Buffer.from(JSON.stringify(objeto)).toString('base64url');
const assinar = (texto, segredo) => crypto.createHmac('sha256', segredo).update(texto).digest('base64url');

function criarToken(dados, segredo, expiraEmSegundos = 3600, agora = Date.now()) {
  const iat = Math.floor(agora / 1000);
  const cabecalho = codificar({ alg: 'HS256', typ: 'JWT' });
  const corpo = codificar({ ...dados, iat, exp: iat + expiraEmSegundos });
  return `${cabecalho}.${corpo}.${assinar(`${cabecalho}.${corpo}`, segredo)}`;
}

// Devolve os dados do token se ele for válido, ou null se estiver errado, adulterado ou expirado.
function verificarToken(token, segredo, agora = Date.now()) {
  if (typeof token !== 'string') return null;
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const [cabecalho, corpo, assinatura] = partes;

  try {
    if (JSON.parse(Buffer.from(cabecalho, 'base64url').toString()).alg !== 'HS256') return null;
    const esperada = Buffer.from(assinar(`${cabecalho}.${corpo}`, segredo));
    const recebida = Buffer.from(assinatura);
    if (esperada.length !== recebida.length || !crypto.timingSafeEqual(esperada, recebida)) return null;

    const dados = JSON.parse(Buffer.from(corpo, 'base64url').toString());
    if (typeof dados.exp !== 'number' || dados.exp <= Math.floor(agora / 1000)) return null;
    return dados;
  } catch {
    return null;
  }
}

module.exports = { hashSenha, verificarSenha, criarToken, verificarToken };
