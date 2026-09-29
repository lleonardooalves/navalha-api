# Navalha — API

API de agendamento para barbearias. NestJS + Prisma + PostgreSQL.

> Em construção. Primeira versão sendo feita para uma barbearia real.

## Destaques técnicos

- **Horários calculados, não armazenados:** `horariosLivres()` é uma função pura, com testes em tabela
- **Sem reserva dupla garantida pelo banco:** a restrição `EXCLUDE USING gist` no Postgres impede agendamentos sobrepostos, mesmo com requisições simultâneas
- **Multi-tenant desde o início:** todas as tabelas têm `barbearia_id`

## Rodando localmente

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate dev
npm run start:dev
```

## Testes

```bash
npm test
```