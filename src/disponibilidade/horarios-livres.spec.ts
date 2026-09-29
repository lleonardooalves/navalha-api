import { horariosLivres, Intervalo } from './horarios-livres';

// helper: "09:30" -> 570, para a tabela ficar legível
const m = (hhmm: string) => {
  const [h, min] = hhmm.split(':').map(Number);
  return h * 60 + min;
};
const iv = (inicio: string, fim: string): Intervalo => ({ inicio: m(inicio), fim: m(fim) });

type Caso = {
  nome: string;
  expediente: Intervalo[];
  ocupados?: Intervalo[];
  duracaoMin: number;
  minimoInicio?: number;
  esperado: string[];
};

const casos: Caso[] = [
  {
    nome: 'dia fechado (sem expediente)',
    expediente: [],
    duracaoMin: 30,
    esperado: [],
  },
  {
    nome: 'janela simples, serviço de 30 min',
    expediente: [iv('09:00', '10:00')],
    duracaoMin: 30,
    esperado: ['09:00', '09:15', '09:30'],
  },
  {
    nome: 'serviço que não cabe no fim do expediente',
    expediente: [iv('09:00', '10:00')],
    duracaoMin: 45,
    esperado: ['09:00', '09:15'],
  },
  {
    nome: 'serviço maior que a janela inteira',
    expediente: [iv('09:00', '10:00')],
    duracaoMin: 90,
    esperado: [],
  },
  {
    nome: 'almoço no meio (dois turnos)',
    expediente: [iv('09:00', '10:00'), iv('11:00', '12:00')],
    duracaoMin: 30,
    esperado: ['09:00', '09:15', '09:30', '11:00', '11:15', '11:30'],
  },
  {
    nome: 'agendamento no meio da manhã',
    expediente: [iv('09:00', '11:00')],
    ocupados: [iv('09:30', '10:00')],
    duracaoMin: 30,
    esperado: ['09:00', '10:00', '10:15', '10:30'],
  },
  {
    nome: 'serviço de 60 min precisa de blocos seguidos',
    expediente: [iv('09:00', '12:00')],
    ocupados: [iv('10:00', '10:30')],
    duracaoMin: 60,
    esperado: ['09:00', '10:30', '10:45', '11:00'],
  },
  {
    nome: 'horários no passado (ou dentro da antecedência) somem',
    expediente: [iv('09:00', '11:00')],
    duracaoMin: 30,
    minimoInicio: m('10:00'),
    esperado: ['10:00', '10:15', '10:30'],
  },
  {
    nome: 'mínimo quebrado arredonda para o próximo da grade',
    expediente: [iv('09:00', '11:00')],
    duracaoMin: 30,
    minimoInicio: m('09:47'),
    esperado: ['10:00', '10:15', '10:30'],
  },
  {
    nome: 'depois de um serviço quebrado, volta a alinhar na grade',
    expediente: [iv('09:00', '11:00')],
    ocupados: [iv('09:00', '09:20')],
    duracaoMin: 30,
    esperado: ['09:30', '09:45', '10:00', '10:15', '10:30'],
  },
  {
    nome: 'bloqueio o dia todo (folga)',
    expediente: [iv('09:00', '12:00')],
    ocupados: [iv('00:00', '23:59')],
    duracaoMin: 30,
    esperado: [],
  },
];

describe('horariosLivres', () => {
  it.each(casos)(
    '$nome',
    ({ expediente, ocupados = [], duracaoMin, minimoInicio = 0, esperado }) => {
      const resultado = horariosLivres({
        expediente,
        ocupados,
        duracaoMin,
        passoMin: 15,
        minimoInicio,
      });

      expect(resultado).toEqual(esperado.map(m));
    },
  );
});
