// server.js (com login) - bloco "ServidorExpress" + "HealthRouter" + "ErroAPI" do diagrama.
// Ordem: CORS -> express.json -> Log -> rotas -> 404 -> tratador de erros.
// A ordem dos app.use importa: o Express executa na sequência em que foram registrados.

require('dotenv').config();   // lê o arquivo .env (senha do MySQL etc.)

const path = require('node:path');
const cors = require('cors');
const express = require('express');
const { conectar, executar, fechar } = require('./database');
const produtosRouter = require('./routes/produtos');
const authRouter = require('./routes/auth');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Bloco Log: uma linha por requisição, ex.: [api] GET /api/produtos
function registrarLog(req, res, next) {
  console.log(`[api] ${req.method} ${req.path}`);
  next();
}

// HealthRouter - GET /api/health: 200 se o banco responder, 503 se estiver fora do ar.
async function verificar(req, res) {
  try {
    await executar('SELECT 1 AS connected');
    res.json({ status: 'ok', database: 'connected' });
  } catch (erro) {
    console.error(`[db] ${erro.message}`);
    res.status(503).json({ status: 'erro', database: 'disconnected' });
  }
}

// Decisão "Rota existe?": se nenhuma rota respondeu, cai aqui (404).
function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada.' });
}

// ErroAPI: o Express reconhece o tratador de erros pelos 4 parâmetros.
function tratarErros(erro, req, res, next) {
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido.' });
  }
  if (erro.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'Corpo da requisição maior que 100 kb.' });
  }
  if (erro.code === 'ER_NO_REFERENCED_ROW_2' || erro.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return res.status(400).json({ erro: 'Dados incompatíveis com as regras do banco.' });
  }
  console.error(`[api] ${erro.message}`);   // o detalhe vai só para o log
  res.status(500).json({ erro: 'Erro interno da API.' });
}

app.use(cors());                            // libera o acesso de outros sites
app.use(express.json({ limit: '100kb' }));  // lê o corpo em JSON (até 100 kb)
app.use(registrarLog);

// Página de login: http://localhost:3000/login.html (arquivos da pasta "public")
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.redirect('/login.html'));

app.get('/api/health', verificar);
app.use('/api/auth', authRouter);          // login e rota protegida
app.use('/api/produtos', produtosRouter);

app.use(rotaNaoEncontrada);
app.use(tratarErros);

// iniciar(): testa o banco e sobe o servidor.
async function iniciar() {
  if (!process.env.JWT_SECRET) console.warn('[auth] JWT_SECRET não definido no .env: usando segredo de desenvolvimento.');
  try {
    await conectar();
    console.log('[db] MySQL conectado');
  } catch (erro) {
    // A API sobe mesmo assim, e o /api/health mostrará 503 até o MySQL voltar.
    console.error(`[db] Sem conexão com o MySQL: ${erro.message}`);
  }
  const servidor = app.listen(PORT, () => console.log(`[api] Express executando na porta ${PORT}`));

  // Ctrl+C: fecha o servidor e as conexões com o banco.
  process.once('SIGINT', () => servidor.close(async () => { await fechar(); process.exit(0); }));
  return servidor;
}

if (require.main === module) iniciar();

module.exports = { app, iniciar };
