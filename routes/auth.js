// routes/auth.js - login e rota protegida.
//   POST /api/auth/login -> 200 com o access_token | 400 (faltou campo) | 401 (e-mail ou senha errados)
//   GET  /api/auth/me    -> 200 com o usuário      | 401 (sem token, token inválido ou expirado)

const express = require('express');
const { executar } = require('../database');
const { criarToken, verificarToken, verificarSenha } = require('../auth');

const router = express.Router();
const EXPIRA_EM = Number(process.env.JWT_EXPIRES_IN) || 3600;   // segundos (padrão: 1 hora)

// Segredo usado para assinar os tokens. Fica no .env, nunca no código.
function segredo() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('Defina JWT_SECRET no .env');
  return 'segredo-apenas-para-desenvolvimento';
}

// Hash "de mentira": quando o e-mail não existe, conferimos a senha contra ele mesmo assim.
// Assim a resposta demora o mesmo tempo e ninguém descobre quais e-mails são cadastrados.
const HASH_FALSO = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;

async function login(req, res) {
  const { email, senha } = req.body ?? {};

  if (typeof email !== 'string' || typeof senha !== 'string' || !email.trim() || !senha) {
    return res.status(400).json({ erro: 'Informe e-mail e senha.' });
  }
  if (email.length > 150 || senha.length > 128) {
    return res.status(400).json({ erro: 'E-mail ou senha com tamanho inválido.' });
  }

  const [usuario] = await executar(
    'SELECT id, nome, email, senha_hash FROM usuarios WHERE email = ?',
    [email.trim().toLowerCase()],
  );
  const senhaCorreta = await verificarSenha(senha, usuario ? usuario.senha_hash : HASH_FALSO);

  // A mesma mensagem para "e-mail não existe" e "senha errada": não revela qual dos dois falhou.
  if (!usuario || !senhaCorreta) {
    return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
  }

  const access_token = criarToken(
    { sub: usuario.id, email: usuario.email, nome: usuario.nome },
    segredo(),
    EXPIRA_EM,
  );
  res.set('Cache-Control', 'no-store');   // token não deve ficar em cache
  res.json({
    access_token,
    token_type: 'Bearer',
    expires_in: EXPIRA_EM,
    user: { id: usuario.id, nome: usuario.nome, email: usuario.email },
  });
}

// Middleware: só deixa passar quem envia "Authorization: Bearer <token>" válido.
function exigirAutenticacao(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  const dados = tipo === 'Bearer' ? verificarToken(token, segredo()) : null;
  if (!dados) {
    res.set('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ erro: 'Token ausente, inválido ou expirado.' });
  }
  req.usuario = { id: dados.sub, nome: dados.nome, email: dados.email };
  next();
}

function me(req, res) {
  res.json(req.usuario);
}

router.post('/login', login);
router.get('/me', exigirAutenticacao, me);

module.exports = router;
module.exports.login = login;
module.exports.me = me;
module.exports.exigirAutenticacao = exigirAutenticacao;
