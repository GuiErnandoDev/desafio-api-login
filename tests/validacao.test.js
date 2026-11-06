// Testes do ValidadorProduto. Não precisam de MySQL nem de Express. Rodar com: npm test
const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizarTexto, validarSegmento, normalizarPreco, validarCorpo } = require('../validacao');

const valido = {
  name: '  Cadinho   de teste ',
  segmentId: ' LABORATORIO ',
  material: ' Porcelana   de alta alumina ',
  description: ' Peça criada no teste. ',
  price: 12.5,
};

test('normalizarTexto remove espaços sobrando', () => {
  assert.equal(normalizarTexto('  a   b  '), 'a b');
  assert.equal(normalizarTexto('Cerâmica\n  técnica'), 'Cerâmica técnica');
});

test('validarSegmento aceita só os 4 segmentos', () => {
  assert.equal(validarSegmento(' LABORATORIO '), 'laboratorio');
  assert.equal(validarSegmento('aquario'), 'aquario');
  for (const invalido of ['outro', '', null, undefined, 5]) assert.equal(validarSegmento(invalido), null);
});

test('normalizarPreco', () => {
  assert.deepEqual(normalizarPreco(undefined), { valor: null });
  assert.deepEqual(normalizarPreco(null), { valor: null });
  assert.deepEqual(normalizarPreco(12.5), { valor: 12.5 });
  assert.deepEqual(normalizarPreco(0), { valor: 0 });
  for (const invalido of [-1, 1.234, '12', NaN, Infinity, {}]) {
    assert.ok(normalizarPreco(invalido).erro, `${String(invalido)} deveria ser inválido`);
  }
});

test('validarCorpo devolve os dados limpos quando tudo está certo', () => {
  assert.deepEqual(validarCorpo(valido), {
    valor: {
      name: 'Cadinho de teste',
      segmentId: 'laboratorio',
      material: 'Porcelana de alta alumina',
      description: 'Peça criada no teste.',
      price: 12.5,
    },
  });
  assert.equal(validarCorpo({ ...valido, price: undefined }).valor.price, null);
});

test('validarCorpo aponta cada campo com problema', () => {
  const { erros } = validarCorpo({ name: '   ', segmentId: 'x', material: 'a'.repeat(101), description: 5, price: -1 });
  assert.deepEqual(Object.keys(erros).sort(), ['description', 'material', 'name', 'price', 'segmentId']);
  assert.equal(validarCorpo({ ...valido, name: 'x'.repeat(121) }).erros.name, 'Deve ter no máximo 120 caracteres.');
});

test('validarCorpo recusa corpo que não é objeto JSON', () => {
  for (const corpo of [undefined, null, 'texto', 42, [1, 2]]) {
    assert.ok(validarCorpo(corpo).erros.corpo, JSON.stringify(corpo));
  }
});
