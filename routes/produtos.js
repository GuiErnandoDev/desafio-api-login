// routes/produtos.js - bloco "ProdutoRouter" do diagrama.
//
// ETAPA 1 (pronto):  listar() -> GET  /api/produtos
//                    criar()  -> POST /api/produtos   (recebe JSON)
// ETAPA 2 (falta):   consultar(), atualizar() e excluir() - hoje respondem 501

const express = require('express');
const { executar } = require('../database');
const { validarCorpo } = require('../validacao');

const router = express.Router();

// O banco usa snake_case; a API devolve camelCase. O "AS" faz a conversão.
const CAMPOS = `
  id,
  name,
  segment_id AS segmentId,
  material,
  description,
  price,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

// O MySQL devolve DECIMAL como texto ("12.50"); aqui viramos número (12.5).
function formatar(linha) {
  return { ...linha, price: linha.price === null ? null : Number(linha.price) };
}

// GET /api/produtos -> 200 com a lista (vazia se não houver produtos)
async function listar(req, res) {
  const linhas = await executar(`SELECT ${CAMPOS} FROM produtos ORDER BY id`);
  res.json(linhas.map(formatar));
}

// POST /api/produtos -> 201 com o produto criado, ou 400 com os campos inválidos
async function criar(req, res) {
  const { erros, valor } = validarCorpo(req.body);
  if (erros) return res.status(400).json({ erro: 'Dados do produto inválidos.', campos: erros });

  const { name, segmentId, material, description, price } = valor;
  const resultado = await executar(
    'INSERT INTO produtos (name, segment_id, material, description, price) VALUES (?, ?, ?, ?, ?)',
    [name, segmentId, material, description, price],
  );
  const [produto] = await executar(`SELECT ${CAMPOS} FROM produtos WHERE id = ?`, [resultado.insertId]);

  // 201 Created + cabeçalho Location apontando para o novo recurso
  res.location(`/api/produtos/${resultado.insertId}`).status(201).json(formatar(produto));
}

// 501 Not Implemented: a rota está prevista, mas ainda não foi programada.
function naoImplementado(req, res) {
  res.status(501).json({ erro: 'Rota ainda não implementada.' });
}

router.get('/', listar);
router.post('/', criar);
router.get('/:id', naoImplementado);     // etapa 2: consultar()
router.put('/:id', naoImplementado);     // etapa 2: atualizar()
router.delete('/:id', naoImplementado);  // etapa 2: excluir()

module.exports = router;
module.exports.listar = listar;
module.exports.criar = criar;
