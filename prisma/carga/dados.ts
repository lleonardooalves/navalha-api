// Dados da barbearia que usa o Navalha na primeira versão.
// Preços e durações de mercado (2026) até o dono confirmar: TODO marca o que falta conferir.

type Turno = { inicio: string; fim: string }; // 'HH:MM', no fuso da barbearia
type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo ... 6 = sábado

export type DadosCarga = {
  barbearia: {
    nome: string;
    slug: string;
    endereco: string;
    passoGradeMin: number;
    antecedenciaMinimaMin: number;
    prazoCancelamentoMin: number;
    intervaloAtendimentoMin: number;
    toleranciaFaltaMin: number;
  };
  servicos: { nome: string; duracaoMin: number; precoCentavos: number }[];
  equipe: {
    nome: string;
    nomeExibicao: string;
    email: string;
    telefone?: string;
    papel: 'dono' | 'barbeiro';
    comissaoPercentual: number;
    expediente: Partial<Record<DiaSemana, Turno[]>>;
  }[];
};

// dois turnos por dia: o almoço é o intervalo entre eles
const SEMANA: Turno[] = [
  { inicio: '09:00', fim: '12:00' },
  { inicio: '13:00', fim: '19:00' },
];
const SABADO: Turno[] = [
  { inicio: '08:00', fim: '12:00' },
  { inicio: '13:00', fim: '17:00' },
];

export const dados: DadosCarga = {
  barbearia: {
    nome: 'Barbearia Navalha', // TODO: nome real
    slug: 'barbearia-navalha', // TODO: vai no login do app, então não muda depois
    endereco: 'Rua das Palmeiras, 120, Centro', // TODO: endereço real
    passoGradeMin: 15,
    antecedenciaMinimaMin: 30,
    prazoCancelamentoMin: 120, // TODO: política de cancelamento
    intervaloAtendimentoMin: 0,
    toleranciaFaltaMin: 15, // TODO: política de faltas
  },

  // TODO: serviços, durações e preços reais
  servicos: [
    { nome: 'Corte', duracaoMin: 30, precoCentavos: 5000 },
    { nome: 'Barba', duracaoMin: 30, precoCentavos: 4000 },
    { nome: 'Corte + barba', duracaoMin: 60, precoCentavos: 8000 },
    { nome: 'Corte infantil', duracaoMin: 30, precoCentavos: 4000 },
    { nome: 'Pezinho', duracaoMin: 15, precoCentavos: 2000 },
    { nome: 'Sobrancelha', duracaoMin: 15, precoCentavos: 1500 },
    { nome: 'Barboterapia', duracaoMin: 45, precoCentavos: 6000 },
    { nome: 'Pigmentação de barba', duracaoMin: 30, precoCentavos: 3500 },
    { nome: 'Luzes ou platinado', duracaoMin: 120, precoCentavos: 16000 },
  ],

  // TODO: barbeiros, expediente e almoço de cada um, e a regra de comissão
  equipe: [
    {
      nome: 'Rafael Souza',
      nomeExibicao: 'Rafael',
      email: 'rafael@barbearianavalha.com.br',
      papel: 'dono',
      comissaoPercentual: 100,
      expediente: { 2: SEMANA, 3: SEMANA, 4: SEMANA, 5: SEMANA, 6: SABADO },
    },
    {
      nome: 'Lucas Oliveira',
      nomeExibicao: 'Lucas',
      email: 'lucas@barbearianavalha.com.br',
      papel: 'barbeiro',
      comissaoPercentual: 50,
      expediente: { 2: SEMANA, 3: SEMANA, 4: SEMANA, 5: SEMANA, 6: SABADO },
    },
    {
      // folga na terça e fica até mais tarde na sexta
      nome: 'Matheus Lima',
      nomeExibicao: 'Matheus',
      email: 'matheus@barbearianavalha.com.br',
      papel: 'barbeiro',
      comissaoPercentual: 50,
      expediente: {
        3: SEMANA,
        4: SEMANA,
        5: [
          { inicio: '09:00', fim: '12:00' },
          { inicio: '13:00', fim: '20:00' },
        ],
        6: SABADO,
      },
    },
  ],
};
