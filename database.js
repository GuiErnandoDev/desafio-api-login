// database.js - bloco "BancoMySQL" do diagrama.
// Usa um "pool" (grupo de conexões reutilizáveis) do pacote mysql2.

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pi_web',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 5,
});

// Testa a conexão (usado ao iniciar o servidor e no /api/health).
async function conectar() {
  await pool.query('SELECT 1');
}

// Executa um comando SQL com parâmetros (?). Os "?" são trocados pelos valores
// de forma segura, o que impede SQL injection.
//   SELECT -> devolve um array de linhas
//   INSERT -> devolve { insertId, affectedRows, ... }
async function executar(sql, parametros = []) {
  const [resultado] = await pool.execute(sql, parametros);
  return resultado;
}

async function fechar() {
  await pool.end();
}

module.exports = { conectar, executar, fechar };
