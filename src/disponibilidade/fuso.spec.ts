import { diaLocal, paraInstante, paraMinutos } from './fuso';

describe('fuso', () => {
  const dia = diaLocal('2026-10-01', 'America/Sao_Paulo');

  it('meia-noite de São Paulo é 03:00 em UTC', () => {
    expect(dia.inicio.toISOString()).toBe('2026-10-01T03:00:00.000Z');
    expect(dia.diaSemana).toBe(4);
  });

  it('converte instante -> minutos dia', () => {
    const dezEMeia = new Date('2026-10-01T10:30:00-03:00');
    expect(paraMinutos(dezEMeia, dia)).toBe(630);
    expect(paraInstante(630, dia)).toEqual(dezEMeia);
  });

  it('instantes fora do dia são presos na borda', () => {
    expect(paraMinutos(new Date('2026-09-30T22:00:00-03:00'), dia)).toBe(0);
    expect(paraMinutos(new Date('2026-10-02T08:00:00-03:00'), dia)).toBe(1440);
  });
});
