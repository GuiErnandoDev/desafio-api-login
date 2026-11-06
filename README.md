# API com login (access_token) — Express + MySQL

Esta versão acrescenta à API de produtos um **login**: o usuário envia e-mail e senha e recebe um
**access_token** (JWT). Também tem uma **página de login** que faz essa chamada e mostra o token.

## O que foi acrescentado

| Arquivo | O que faz |
|---|---|
| `database/schema.sql` | Nova tabela `usuarios` (senha guardada como hash) e o usuário de teste |
| `auth.js` | Protege a senha (scrypt + sal) e cria/confere o token JWT (HS256). Só usa o `crypto` do Node |
| `routes/auth.js` | `POST /api/auth/login` e `GET /api/auth/me` (rota protegida) |
| `public/login.html` | Página de login: envia o JSON, recebe e mostra o `access_token` |
| `scripts/criar-usuario.js` | Cria outros usuários pelo terminal |
| `server.js` | Passou a servir a pasta `public` e a rota `/api/auth` |
| `tests/auth.test.js` | 6 testes de senha e token |

## Como rodar

1. **MySQL Workbench**: abra `database/schema.sql` e execute tudo (raio). Pode rodar de novo mesmo que já tenha
   rodado a versão anterior: não duplica nada. No final aparece o usuário `admin@pi.com`.
2. **.env**: copie `.env.example` para `.env` (`copy .env.example .env` no Windows) e preencha
   `DB_PASSWORD` (senha do MySQL) e `JWT_SECRET` (qualquer frase longa).
3. `npm install` e `npm start`.
4. Abra **http://localhost:3000/login.html** e entre com `admin@pi.com` / `123456`.

`npm test` roda 12 testes (validador de produtos + senha e token); não precisam do MySQL.

## Rotas de login

| Verbo | Rota | Corpo | Resposta |
|---|---|---|---|
| POST | `/api/auth/login` | `{ "email": "...", "senha": "..." }` | **200** com o token · **400** faltou campo · **401** e-mail ou senha errados |
| GET | `/api/auth/me` | cabeçalho `Authorization: Bearer <token>` | **200** com o usuário · **401** sem token, inválido ou expirado |

Resposta do login (200):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": { "id": 1, "nome": "Administrador", "email": "admin@pi.com" }
}
```

Testando pelo terminal (Windows `cmd`):
```
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@pi.com\",\"senha\":\"123456\"}"
curl http://localhost:3000/api/auth/me -H "Authorization: Bearer COLE_O_TOKEN_AQUI"
```

## Criar outro usuário
```
npm run criar-usuario -- maria@exemplo.com minhaSenha "Maria Silva"
```

## Como funciona (para explicar ao professor)

1. A página envia `POST /api/auth/login` com e-mail e senha em JSON.
2. A API busca o usuário no MySQL pelo e-mail (consulta com `?`, sem SQL injection).
3. Confere a senha com o hash guardado (`scrypt`). A senha em texto nunca é gravada.
4. Se estiver certo, cria o **JWT**: `cabeçalho.dados.assinatura`. A assinatura (HMAC-SHA256 com o `JWT_SECRET`)
   impede que alguém altere os dados sem a API perceber.
5. A página guarda o `access_token` no `localStorage` e, nas próximas chamadas, envia
   `Authorization: Bearer <token>`. A rota protegida confere a assinatura e a validade.

Decisões de segurança já aplicadas: mesma mensagem para "e-mail não existe" e "senha errada" (não revela quais
e-mails existem), comparação em tempo constante, rejeição do algoritmo `none`, token com validade
(`JWT_EXPIRES_IN`) e `Cache-Control: no-store` na resposta do login.

## Observações
- **Se a página for outra** (ex.: um projeto React em outra porta), o `fetch` para
  `http://localhost:3000/api/auth/login` funciona: a API já libera o CORS.
- **localStorage** é simples e serve para a atividade. Em um sistema real, o ideal é cookie `httpOnly`.
- O usuário `admin@pi.com` / `123456` é só para testes: apague-o em um sistema real.
- As rotas de produtos continuam abertas. Para exigir login nelas, importe `exigirAutenticacao` de
  `routes/auth.js` e use `router.post('/', exigirAutenticacao, criar)` em `routes/produtos.js`.
