export type Intervalo = { inicio: number; fim: number }; // minutos desde 00:00, fim exclusivo

type Entrada = {
  expediente: Intervalo[];
  ocupados: Intervalo[];
  duracaoMin: number;
  passoMin: number;
  minimoInicio: number;
};

export function horariosLivres({
  expediente,
  ocupados,
  duracaoMin,
  passoMin,
  minimoInicio,
}: Entrada): number[] {
  const livres: number[] = [];

  for (const turno of expediente) {
    // começa no que vier por último: início do turno ou o mínimo permitido
    const primeiro = Math.max(turno.inicio, minimoInicio);

    // alinha à grade: 09:47 vira 10:00, 09:20 vira 09:30
    const inicioAlinhado = Math.ceil(primeiro / passoMin) * passoMin;

    // enquanto o serviço inteiro ainda cabe dentro do turno
    for (let t = inicioAlinhado; t + duracaoMin <= turno.fim; t += passoMin) {
      const fim = t + duracaoMin;

      // [t, fim) se sobrepõe a algum ocupado?
      const conflita = ocupados.some((o) => t < o.fim && o.inicio < fim);

      if (!conflita) livres.push(t);
    }
  }

  // os turnos podem vir do banco fora de ordem
  return livres.sort((a, b) => a - b);
}
