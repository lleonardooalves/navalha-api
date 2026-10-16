import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BarbeariaRespostaDto } from './dto/barbearia-resposta.dto';

@Injectable()
export class BarbeariasService {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorSlug(slug: string): Promise<BarbeariaRespostaDto> {
    const barbearia = await this.prisma.barbearia.findUnique({
      where: { slug },
      select: {
        id: true,
        nome: true,
        slug: true,
        endereco: true,
        servicos: {
          where: { ativo: true },
          select: { id: true, nome: true, duracaoMin: true, precoCentavos: true },
          orderBy: { duracaoMin: 'asc' },
        },
        barbeiros: {
          where: { ativo: true },
          select: { id: true, nomeExibicao: true },
          orderBy: { nomeExibicao: 'asc' },
        },
      },
    });

    if (!barbearia) throw new NotFoundException('Barbearia não encontrada');
    return barbearia;
  }
}
