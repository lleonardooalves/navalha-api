-- CreateEnum
CREATE TYPE "origem_agendamento" AS ENUM ('app', 'whatsapp', 'presencial');

-- AlterTable
ALTER TABLE "agendamentos" ADD COLUMN     "origem" "origem_agendamento" NOT NULL DEFAULT 'app';
