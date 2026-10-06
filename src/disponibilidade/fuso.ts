import { TZDate } from '@date-fns/tz';

const MIN_MS = 60_000;

export type DiaLocal = {
  inicio: Date;
  fim: Date;
  diaSemana: number;
};

export function diaLocal(data: string, fuso: string): DiaLocal {
  const [ano, mes, dia] = data.split('-').map(Number);
  const inicio = new TZDate(ano, mes - 1, dia, fuso);
  const fim = new TZDate(ano, mes - 1, dia + 1, fuso);

  return {
    inicio: new Date(inicio.getTime()),
    fim: new Date(fim.getTime()),
    diaSemana: inicio.getDay(),
  };
}

export function paraMinutos(instante: Date, dia: DiaLocal): number {
  const minutos = Math.floor((instante.getTime() - dia.inicio.getTime()) / MIN_MS);
  const minutosNoDia = (dia.fim.getTime() - dia.inicio.getTime()) / MIN_MS;

  return Math.min(Math.max(minutos, 0), minutosNoDia);
}

export function paraInstante(minutos: number, dia: DiaLocal): Date {
  return new Date(dia.inicio.getTime() + minutos * MIN_MS);
}
