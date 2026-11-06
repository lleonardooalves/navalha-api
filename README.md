# Navalha API

[![CI](https://github.com/lleonardooalves/navalha-api/actions/workflows/ci.yml/badge.svg)](https://github.com/lleonardooalves/navalha-api/actions/workflows/ci.yml)

API REST do Navalha, um sistema de agendamento para barbearias. O cliente marca horário pelo app, o barbeiro cuida do dia dele e o dono acompanha a agenda de toda a equipe e encaixa quem chega sem marcar.

A primeira versão do backend está pronta e foi feita para uma barbearia real. O app mobile e o painel web consomem esta mesma API.

## Sumário

- [Destaques técnicos](#destaques-técnicos)
- [Stack](#stack)
- [Como rodar](#como-rodar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Autenticação](#autenticação)
- [Endpoints](#endpoints)
- [Como funciona](#como-funciona)
- [Dados iniciais](#dados-iniciais)
- [Testes](#testes)
- [Estrutura do projeto](#estrutura-do-projeto)

## Destaques técnicos

- **Horários calculados, não armazenados:** os horários livres saem de `horariosLivres()`, uma função pura coberta por testes em tabela.
- **Reserva dupla impossível:** quem garante é o banco, com uma restrição `EXCLUDE USING gist`, mesmo com requisições simultâneas.
- **Pronto para várias barbearias:** todas as tabelas têm `barbearia_id`, e toda consulta filtra pela barbearia do token.
- **Sessões seguras:** access token curto, refresh token com rotação a cada uso e detecção de reuso.
- **Corridas tratadas no banco:** cancelar, concluir e renovar token usam um `UPDATE` condicional, então só uma de duas ações simultâneas vale.

## Stack

| Parte | Tecnologia |
| --- | --- |
| Linguagem e runtime | TypeScript 6, Node.js 24 |
| Framework | NestJS 12 |
| Banco de dados | PostgreSQL 16 |
| ORM | Prisma 7 |
| Autenticação | JWT e argon2 |
| Documentação | Swagger |
| Testes | Jest e Supertest |
| Qualidade | oxlint, Prettier e GitHub Actions |

## Como rodar

Você precisa do Node.js 24 e do Docker.

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

A API sobe em `http://localhost:3000`, e o Swagger fica em `http://localhost:3000/docs`.

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm run start:dev` | Sobe a API com recarga automática |
| `npm run build` | Compila para `dist/` |
| `npm run start:prod` | Roda a versão compilada |
| `npm test` | Roda os testes unitários |
| `npm run test:e2e` | Roda os testes e2e contra o banco de teste |
| `npm run lint` | Roda o oxlint |
| `npm run format` | Formata o código com o Prettier |
| `npm run carga` | Grava os dados da barbearia (veja [Dados iniciais](#dados-iniciais)) |

> O `prisma migrate dev` não roda o `generate`. Depois de mudar o schema, rode os dois.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | Conexão com o banco principal |
| `DATABASE_URL_TEST` | Para os e2e | Conexão com o banco de teste, que os e2e usam no lugar do principal |
| `JWT_SECRET` | Sim | Segredo que assina os access tokens |
| `PORT` | Não | Porta da API (padrão: `3000`) |
| `SEED_SENHA` | Não | Senha das contas de demonstração (padrão: `senha-demo-123`) |
| `CARGA_SENHA` | Para a carga | Senha inicial da equipe no `npm run carga` |

## Autenticação

Todas as rotas exigem login, exceto as marcadas como públicas. O login usa email e senha, e também recebe o `slug` da barbearia, porque o email é único por barbearia.

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"slug":"navalha-demo","email":"ze@navalha.demo","senha":"senha-demo-123"}'
```

A resposta traz dois tokens:

| Token | Validade | Uso |
| --- | --- | --- |
| `accessToken` | 15 minutos | Vai no cabeçalho `Authorization: Bearer <token>` |
| `refreshToken` | 30 dias | Gera um novo par em `POST /auth/renovar` |

Cada renovação invalida o refresh token usado. Se um token já usado aparecer de novo, ele provavelmente vazou, e todas as sessões do usuário são derrubadas.

Existem três papéis: `cliente`, `barbeiro` e `dono`. O cadastro aberto sempre cria um `cliente`. O dono também pode ser barbeiro, então ele acessa as rotas dos dois.

## Endpoints

A referência completa, com os formatos de entrada e saída, está no Swagger, em `/docs`.

### Públicos

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/barbearias/:slug` | Dados da barbearia, serviços e barbeiros ativos |
| `GET` | `/disponibilidade?data=&servicoId=&barbeiroId=` | Horários livres do dia; sem `barbeiroId`, considera todos |
| `POST` | `/auth/cadastro` | Cria uma conta de cliente |
| `POST` | `/auth/login` | Entra e devolve os tokens |
| `POST` | `/auth/renovar` | Troca o refresh token por um novo par |
| `POST` | `/auth/sair` | Encerra a sessão |

### Quem está logado

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/me` | Perfil do usuário |
| `GET` | `/me/agendamentos?periodo=` | Agendamentos `proximos` (padrão) ou `passados` |
| `POST` | `/agendamentos` | Agenda um horário; sem `barbeiroId`, escolhe o barbeiro com menos atendimentos no dia |
| `POST` | `/agendamentos/:id/cancelar` | Cancela, respeitando o prazo da barbearia |

### Barbeiro e dono

Cada um só mexe nos próprios atendimentos e bloqueios.

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/barbeiro/agenda?data=` | Turnos, atendimentos e bloqueios do dia; sem data, mostra hoje |
| `POST` | `/barbeiro/bloqueios` | Bloqueia um intervalo |
| `DELETE` | `/barbeiro/bloqueios/:id` | Libera um intervalo |
| `POST` | `/barbeiro/atendimentos/:id/concluir` | Conclui o atendimento, a partir do horário de início |
| `POST` | `/barbeiro/atendimentos/:id/falta` | Marca falta, depois da tolerância de atraso |

### Dono

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/dono/agenda?data=` | Agenda do dia, com uma coluna por barbeiro ativo |
| `POST` | `/dono/encaixes` | Encaixa um cliente sem conta, só para hoje |

### Respostas de erro

| Status | Quando |
| --- | --- |
| `400` | Dados inválidos |
| `401` | Sem login ou token inválido |
| `403` | Logado, mas sem permissão |
| `404` | Não existe, ou pertence a outra barbearia ou a outro barbeiro |
| `409` | O horário acabou de ser ocupado, ou o email já está cadastrado |
| `422` | Regra de negócio, como cancelar fora do prazo |

## Como funciona

### Horários livres

Os horários não ficam no banco. Eles são calculados a cada consulta:

```
janelas = expediente do dia − bloqueios − agendamentos ativos

para cada janela:
  t = primeiro horário da grade na janela
  enquanto t + duração do serviço <= fim da janela:
    se t >= agora + antecedência mínima: oferece t
    t += passo da grade
```

Cada turno é um registro de expediente, então o almoço é só o intervalo entre dois turnos. Os horários são gravados em UTC (`timestamptz`) e calculados no fuso da barbearia.

### Sem reserva dupla

O front pode mostrar um horário que outra pessoa acabou de pegar, então quem decide é o banco. Essa restrição fica numa migration em SQL, porque o Prisma não a representa:

```sql
ALTER TABLE agendamentos ADD CONSTRAINT sem_conflito
  EXCLUDE USING gist (
    barbeiro_id WITH =,
    tstzrange(inicio, fim) WITH &&
  ) WHERE (status IN ('pendente', 'confirmado'));
```

Se duas pessoas pedem o mesmo horário ao mesmo tempo, uma grava e a outra recebe `409`. O app então recarrega os horários livres. Um e2e dispara várias requisições simultâneas para garantir isso.

### Encaixe

O encaixe segue o mesmo caminho do agendamento pelo app, com duas diferenças: vale só para hoje e ignora a antecedência mínima, porque o cliente já está na porta.

Todo agendamento guarda a `origem` (`app`, `whatsapp` ou `presencial`), para medir quanto do movimento passa pelo app.

### Regras por barbearia

Ficam em colunas de `barbearias`, com estes valores padrão:

| Regra | Coluna | Padrão |
| --- | --- | --- |
| Passo da grade | `passo_grade_min` | 15 min |
| Antecedência mínima para agendar | `antecedencia_minima_min` | 60 min |
| Prazo para cancelar | `prazo_cancelamento_min` | 120 min |
| Intervalo entre atendimentos | `intervalo_atendimento_min` | 0 min |
| Tolerância de atraso antes da falta | `tolerancia_falta_min` | 15 min |

## Dados iniciais

| Comando | Para que serve |
| --- | --- |
| `npx prisma db seed` | Cria a barbearia de demonstração, para desenvolvimento |
| `npm run carga` | Grava os dados da barbearia real, que ficam em `prisma/carga/dados.ts` |

A barbearia de demonstração tem o slug `navalha-demo` e duas contas: `ze@navalha.demo` (dono, também barbeiro) e `pedro@navalha.demo` (barbeiro).

A carga pode rodar de novo sempre que os dados mudarem. Ela atualiza o que já existe, cria o que falta e nunca troca a senha de quem já tem conta. Serviço ou barbeiro que sai da lista fica inativo, para não quebrar o histórico.

## Testes

```bash
npm test
npm run test:e2e
```

- **Unitários** (`src/**/*.spec.ts`): as funções puras, como `horariosLivres()` e as conversões de fuso.
- **E2e** (`test/*.e2e-spec.ts`): as rotas de ponta a ponta, contra um banco separado (`DATABASE_URL_TEST`), que recebe as migrations antes de rodar. Precisam do Postgres de pé. Cada arquivo usa o próprio slug e limpa só o que criou.

O GitHub Actions roda lint, formatação, build e os dois tipos de teste em todo pull request.

## Estrutura do projeto

```
prisma/
├── schema.prisma
├── migrations/
├── seed.ts              barbearia de demonstração
└── carga/               dados e script da barbearia real
src/
├── auth/                cadastro, login, sessões, guards e decorators
├── barbearias/          catálogo público
├── disponibilidade/     horariosLivres() e fuso
├── agendamentos/        agendar e cancelar
├── me/                  perfil e agendamentos do usuário
├── barbeiro/            agenda, bloqueios e encerrar atendimento
├── dono/                agenda da equipe e encaixe
├── prisma/              conexão com o banco
└── generated/           client do Prisma (fora do Git)
test/                    testes e2e
```

No código, o domínio fica em português (`Agendamento`, `horariosLivres()`) e os termos técnicos em inglês (`service`, `controller`, `dto`). No banco, tabelas e colunas usam snake_case em português.
