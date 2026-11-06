-- ============================================================
--API-Login - criação do banco (MySQL 8 / MySQL Workbench)
-- Como executar: File > Open SQL Script... > escolha este arquivo
--                e clique no raio (Execute) ou use Ctrl+Shift+Enter.
-- Pode rodar mais de uma vez: não duplica os dados.
-- ============================================================

CREATE DATABASE IF NOT EXISTS API-Login CHARACTER SET utf8mb4;
USE API-Login;

-- Tabela Segmento (a "enumeration" do diagrama): 4 valores fixos.
CREATE TABLE IF NOT EXISTS segmentos (
  id   VARCHAR(20) NOT NULL,
  nome VARCHAR(60) NOT NULL,
  PRIMARY KEY (id)
) ENGINE = InnoDB;

-- Tabela Produto. A chave estrangeira garante que segment_id exista em segmentos.
CREATE TABLE IF NOT EXISTS produtos (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name        VARCHAR(120)  NOT NULL,
  segment_id  VARCHAR(20)   NOT NULL,
  material    VARCHAR(100)  NOT NULL,
  description VARCHAR(500)  NOT NULL,
  price       DECIMAL(10,2) NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_produtos_segmento FOREIGN KEY (segment_id) REFERENCES segmentos (id),
  CONSTRAINT ck_produtos_price CHECK (price IS NULL OR price >= 0)
) ENGINE = InnoDB;

-- Dados iniciais
INSERT IGNORE INTO segmentos (id, nome) VALUES
  ('fundicao',    'Fundição'),
  ('laboratorio', 'Laboratório'),
  ('analise',     'Análise'),
  ('aquario',     'Aquário');

INSERT INTO produtos (name, segment_id, material, description, price)
SELECT name, segment_id, material, description, price FROM (
  SELECT 'Canal de vazamento' AS name, 'fundicao' AS segment_id, 'Refratário de alta alumina' AS material,
         'Componente para condução do metal líquido durante a fundição.' AS description, NULL AS price
  UNION ALL SELECT 'Bucha cerâmica', 'fundicao', 'Cerâmica técnica',
         'Peça moldada para isolamento e proteção em processos metalúrgicos.', NULL
  UNION ALL SELECT 'Cadinho de análise', 'laboratorio', 'Cerâmica para laboratório',
         'Recipiente para procedimentos de análise em laboratório.', NULL
  UNION ALL SELECT 'Barqueta de combustão', 'analise', 'Cerâmica refratária',
         'Suporte cerâmico usado na preparação de amostras para análise.', NULL
  UNION ALL SELECT 'Mídia biológica', 'aquario', 'Cerâmica porosa',
         'Elemento cerâmico para sistemas de filtragem de aquários.', NULL
) AS inicial
WHERE NOT EXISTS (SELECT 1 FROM produtos);

-- ------------------------------------------------------------
-- LOGIN: tabela de usuários. A senha é guardada como hash (nunca em texto).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE = InnoDB;

-- Usuário de demonstração:  e-mail admin@pi.com  |  senha 123456
INSERT IGNORE INTO usuarios (nome, email, senha_hash) VALUES
  ('Administrador', 'admin@pi.com', 'scrypt$a1b2c3d4e5f60718293a4b5c6d7e8f90$bf6bdd1693dc31289e14d0eca9d8dd21d9e5d6945a99a798b2bbd904873d4578962b2471595c04a15459dab8ff124511d0288e7e5d3c60b4a850d8211c4903db');

-- Conferência: deve mostrar os 5 produtos.
SELECT * FROM produtos;
SELECT id, nome, email FROM usuarios;
