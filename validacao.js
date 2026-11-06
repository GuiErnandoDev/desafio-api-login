// validacao.js - bloco "ValidadorProduto" do diagrama.
// Funções puras (não usam banco nem Express), por isso são fáceis de testar.
//
// ETAPA 1 (pronto):  normalizarTexto, validarSegmento, normalizarPreco, validarCorpo
// ETAPA 2 (falta):   validarId (será usada por consultar, atualizar e excluir)

const SEGMENTOS = ['fundicao', 'laboratorio', 'analise', 'aquario'];
const LIMITES = { name: 120, material: 100, description: 500 };

// Remove espaços das pontas, junta espaços repetidos e padroniza acentos (NFC).
function normalizarTexto(texto) {
  return texto.normalize('NFC').trim().replace(/\s+/g, ' ');
}

// Devolve o segmento em minúsculas, ou null se não for um dos 4 permitidos.
function validarSegmento(valor) {
  if (typeof valor !== 'string') return null;
  const segmento = valor.trim().toLowerCase();
  return SEGMENTOS.includes(segmento) ? segmento : null;
}

// Preço é opcional. Aceita null/ausente ou número >= 0 com até 2 casas decimais.
// Devolve { valor } se estiver certo, ou { erro } se estiver errado.
function normalizarPreco(valor) {
  if (valor === undefined || valor === null) return { valor: null };
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) {
    return { erro: 'Informe um número não negativo com até 2 casas decimais, ou null.' };
  }
  const centavos = Math.round(valor * 100);
  if (Math.abs(valor * 100 - centavos) > 1e-7) {
    return { erro: 'Informe um número não negativo com até 2 casas decimais, ou null.' };
  }
  return { valor: centavos / 100 };
}

// Valida o corpo inteiro do POST. Devolve { valor } (dados limpos) ou { erros } (por campo).
function validarCorpo(corpo) {
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) {
    return { erros: { corpo: 'Envie um objeto JSON com os dados do produto.' } };
  }

  const erros = {};
  const texto = {};
  for (const campo of Object.keys(LIMITES)) {
    if (typeof corpo[campo] !== 'string') {
      erros[campo] = 'Deve ser um texto.';
      continue;
    }
    texto[campo] = normalizarTexto(corpo[campo]);
    if (!texto[campo]) erros[campo] = 'É obrigatório.';
    else if (texto[campo].length > LIMITES[campo]) erros[campo] = `Deve ter no máximo ${LIMITES[campo]} caracteres.`;
  }

  const segmentId = validarSegmento(corpo.segmentId);
  if (!segmentId) erros.segmentId = `Use um dos segmentos: ${SEGMENTOS.join(', ')}.`;

  const preco = normalizarPreco(corpo.price);
  if (preco.erro) erros.price = preco.erro;

  if (Object.keys(erros).length > 0) return { erros };
  return { valor: { name: texto.name, segmentId, material: texto.material, description: texto.description, price: preco.valor } };
}

module.exports = { SEGMENTOS, normalizarTexto, validarSegmento, normalizarPreco, validarCorpo };
