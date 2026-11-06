// Testes de senha e token. Não precisam de MySQL nem de Express. Rodar com: npm test
const assert = require('node:assert/strict');
const test = require('node:test');
const { hashSenha, verificarSenha, criarToken, verificarToken } = require('../auth');

const SEGREDO = 'segredo-de-teste';

test('hashSenha nunca guarda a senha em texto e usa sal diferente a cada vez', async () => {
  const a = await hashSenha('123456');
  const b = await hashSenha('123456');
  assert.match(a, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.ok(!a.includes('123456'));
  assert.notEqual(a, b);
});

test('verificarSenha aceita a senha certa e recusa a errada', async () => {
  const guardado = await hashSenha('123456');
  assert.equal(await verificarSenha('123456', guardado), true);
  assert.equal(await verificarSenha('1234567', guardado), false);
  assert.equal(await verificarSenha('', guardado), false);
  for (const invalido of [undefined, null, '', 'texto', 'scrypt$so-duas-partes', 'md5$a$b']) {
    assert.equal(await verificarSenha('123456', invalido), false);
  }
});

test('o usuário de demonstração do schema.sql confere com a senha 123456', async () => {
  const demo = 'scrypt$a1b2c3d4e5f60718293a4b5c6d7e8f90$bf6bdd1693dc31289e14d0eca9d8dd21d9e5d6945a99a798b2bbd904873d4578962b2471595c04a15459dab8ff124511d0288e7e5d3c60b4a850d8211c4903db';
  assert.equal(await verificarSenha('123456', demo), true);
  assert.equal(await verificarSenha('outra', demo), false);
});

test('criarToken gera um JWT com 3 partes e os dados dentro', () => {
  const token = criarToken({ sub: 1, email: 'a@b.com', nome: 'Ana' }, SEGREDO, 3600, 1_000_000_000_000);
  const [cab, corpo] = token.split('.');
  assert.equal(token.split('.').length, 3);
  assert.deepEqual(JSON.parse(Buffer.from(cab, 'base64url')), { alg: 'HS256', typ: 'JWT' });
  const dados = JSON.parse(Buffer.from(corpo, 'base64url'));
  assert.deepEqual([dados.sub, dados.email, dados.nome], [1, 'a@b.com', 'Ana']);
  assert.equal(dados.exp - dados.iat, 3600);
});

test('verificarToken devolve os dados de um token válido', () => {
  const token = criarToken({ sub: 7, email: 'a@b.com', nome: 'Ana' }, SEGREDO);
  const dados = verificarToken(token, SEGREDO);
  assert.equal(dados.sub, 7);
  assert.equal(dados.email, 'a@b.com');
});

test('verificarToken recusa token com segredo errado, adulterado, expirado ou malformado', () => {
  const agora = Date.now();
  const token = criarToken({ sub: 7, email: 'a@b.com', nome: 'Ana' }, SEGREDO, 3600, agora);

  assert.equal(verificarToken(token, 'outro-segredo', agora), null);                 // segredo errado

  const [cab, corpo, assin] = token.split('.');
  const falso = Buffer.from(JSON.stringify({ sub: 1, email: 'admin@x.com', exp: 9999999999 })).toString('base64url');
  assert.equal(verificarToken(`${cab}.${falso}.${assin}`, SEGREDO, agora), null);   // dados alterados

  assert.equal(verificarToken(token, SEGREDO, agora + 3600 * 1000 + 1000), null);   // expirado

  const semAssinatura = `${cab}.${Buffer.from(JSON.stringify({ sub: 1, exp: 9999999999 })).toString('base64url')}.`;
  assert.equal(verificarToken(semAssinatura, SEGREDO, agora), null);                // sem assinatura

  const algNone = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  assert.equal(verificarToken(`${algNone}.${corpo}.${assin}`, SEGREDO, agora), null); // algoritmo "none"

  for (const lixo of [undefined, null, '', 'abc', 'a.b', 'a.b.c.d', 123]) {
    assert.equal(verificarToken(lixo, SEGREDO, agora), null);
  }
});
