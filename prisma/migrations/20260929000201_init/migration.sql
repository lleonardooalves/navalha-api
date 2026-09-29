-- CreateEnum
CREATE TYPE "papel_usuario" AS ENUM ('cliente', 'barbeiro', 'dono');

-- CreateEnum
CREATE TYPE "status_agendamento" AS ENUM ('pendente', 'confirmado', 'concluido', 'cancelado', 'no_show');

-- CreateEnum
CREATE TYPE "motivo_bloqueio" AS ENUM ('almoco', 'folga', 'feriado', 'outro');

-- CreateTable
CREATE TABLE "barbearias" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "endereco" TEXT,
    "fuso" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "passo_grade_min" INTEGER NOT NULL DEFAULT 15,
    "antecedencia_minima_min" INTEGER NOT NULL DEFAULT 60,
    "prazo_cancelamento_min" INTEGER NOT NULL DEFAULT 120,
    "intervalo_atendimento_min" INTEGER NOT NULL DEFAULT 0,
    "tolerancia_falta_min" INTEGER NOT NULL DEFAULT 15,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "barbearias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "barbearia_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "senha_hash" TEXT NOT NULL,
    "papel" "papel_usuario" NOT NULL DEFAULT 'cliente',
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barbeiros" (
    "id" UUID NOT NULL,
    "barbearia_id" UUID NOT NULL,
    "usuario_id" UUID,
    "nome_exibicao" TEXT NOT NULL,
    "comissao_percentual" INTEGER NOT NULL DEFAULT 50,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "barbeiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" UUID NOT NULL,
    "barbearia_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "duracao_min" INTEGER NOT NULL,
    "preco_centavos" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expediente" (
    "id" UUID NOT NULL,
    "barbearia_id" UUID NOT NULL,
    "barbeiro_id" UUID NOT NULL,
    "dia_semana" INTEGER NOT NULL,
    "inicio_min" INTEGER NOT NULL,
    "fim_min" INTEGER NOT NULL,

    CONSTRAINT "expediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloqueios" (
    "id" UUID NOT NULL,
    "barbearia_id" UUID NOT NULL,
    "barbeiro_id" UUID NOT NULL,
    "inicio" TIMESTAMPTZ NOT NULL,
    "fim" TIMESTAMPTZ NOT NULL,
    "motivo" "motivo_bloqueio" NOT NULL,
    "observacao" TEXT,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bloqueios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" UUID NOT NULL,
    "barbearia_id" UUID NOT NULL,
    "barbeiro_id" UUID NOT NULL,
    "cliente_id" UUID,
    "nome_cliente" TEXT,
    "servico_id" UUID NOT NULL,
    "inicio" TIMESTAMPTZ NOT NULL,
    "fim" TIMESTAMPTZ NOT NULL,
    "status" "status_agendamento" NOT NULL DEFAULT 'confirmado',
    "expira_em" TIMESTAMPTZ,
    "preco_cobrado_centavos" INTEGER NOT NULL,
    "observacao" TEXT,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "barbearias_slug_key" ON "barbearias"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_barbearia_id_email_key" ON "usuarios"("barbearia_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "barbeiros_usuario_id_key" ON "barbeiros"("usuario_id");

-- CreateIndex
CREATE INDEX "expediente_barbeiro_id_dia_semana_idx" ON "expediente"("barbeiro_id", "dia_semana");

-- CreateIndex
CREATE INDEX "bloqueios_barbeiro_id_inicio_idx" ON "bloqueios"("barbeiro_id", "inicio");

-- CreateIndex
CREATE INDEX "agendamentos_barbeiro_id_inicio_idx" ON "agendamentos"("barbeiro_id", "inicio");

-- CreateIndex
CREATE INDEX "agendamentos_cliente_id_inicio_idx" ON "agendamentos"("cliente_id", "inicio");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_barbearia_id_fkey" FOREIGN KEY ("barbearia_id") REFERENCES "barbearias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barbeiros" ADD CONSTRAINT "barbeiros_barbearia_id_fkey" FOREIGN KEY ("barbearia_id") REFERENCES "barbearias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barbeiros" ADD CONSTRAINT "barbeiros_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_barbearia_id_fkey" FOREIGN KEY ("barbearia_id") REFERENCES "barbearias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expediente" ADD CONSTRAINT "expediente_barbearia_id_fkey" FOREIGN KEY ("barbearia_id") REFERENCES "barbearias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expediente" ADD CONSTRAINT "expediente_barbeiro_id_fkey" FOREIGN KEY ("barbeiro_id") REFERENCES "barbeiros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueios" ADD CONSTRAINT "bloqueios_barbearia_id_fkey" FOREIGN KEY ("barbearia_id") REFERENCES "barbearias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueios" ADD CONSTRAINT "bloqueios_barbeiro_id_fkey" FOREIGN KEY ("barbeiro_id") REFERENCES "barbeiros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_barbearia_id_fkey" FOREIGN KEY ("barbearia_id") REFERENCES "barbearias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_barbeiro_id_fkey" FOREIGN KEY ("barbeiro_id") REFERENCES "barbeiros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Regras que o Prisma não expressa ─────────────────────

-- Sem reserva dupla: o mesmo barbeiro não pode ter dois agendamentos
-- ativos com intervalos que se sobrepõem.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE agendamentos ADD CONSTRAINT sem_conflito
  EXCLUDE USING gist (
    barbeiro_id WITH =,
    tstzrange(inicio, fim) WITH &&
  ) WHERE (status IN ('pendente', 'confirmado'));

-- Sanidade dos dados
ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_fim_depois_inicio CHECK (fim > inicio);

ALTER TABLE bloqueios    ADD CONSTRAINT bloqueios_fim_depois_inicio    CHECK (fim > inicio);

ALTER TABLE expediente ADD CONSTRAINT expediente_dia_semana_valido CHECK (dia_semana BETWEEN 0 AND 6);

ALTER TABLE expediente ADD CONSTRAINT expediente_horario_valido
  CHECK (inicio_min >= 0 AND fim_min <= 1440 AND fim_min > inicio_min);

ALTER TABLE servicos  ADD CONSTRAINT servicos_valores_validos
  CHECK (duracao_min > 0 AND preco_centavos >= 0);
  
ALTER TABLE barbeiros ADD CONSTRAINT barbeiros_comissao_valida
  CHECK (comissao_percentual BETWEEN 0 AND 100);