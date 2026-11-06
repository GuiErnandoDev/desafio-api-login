// Cria um usuário no banco com a senha já protegida (hash).
// Uso:  npm run criar-usuario -- email@exemplo.com minhaSenha "Nome do Usuário"

require('dotenv').config();
const { executar, fechar } = require('../database');
const { hashSenha } = require('../auth');

async function main() {
  const [email, senha, ...resto] = process.argv.slice(2);
  const nome = resto.join(' ').trim() || email;
  if (!email || !senha) {
    console.log('Uso: npm run criar-usuario -- email senha "Nome do Usuário"');
    process.exitCode = 1;
    return;
  }
  try {
    await executar('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
      [nome, email.trim().toLowerCase(), await hashSenha(senha)]);
    console.log(`Usuário criado: ${email.trim().toLowerCase()}`);
  } catch (erro) {
    console.error(erro.code === 'ER_DUP_ENTRY' ? 'Esse e-mail já está cadastrado.' : `Erro: ${erro.message}`);
    process.exitCode = 1;
  } finally {
    await fechar();
  }
}
main();
