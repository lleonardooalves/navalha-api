import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { CadastroDto } from './dto/cadastro.dto';
import { TokensRespostaDto } from './dto/tokens-resposta.dto';
import * as argon2 from 'argon2';
import { Prisma } from '../generated/prisma/client';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async cadastrar(dto: CadastroDto): Promise<TokensRespostaDto> {
    const barbearia = await this.prisma.barbearia.findUnique({ where: { slug: dto.slug } });
    if (!barbearia) throw new NotFoundException('Barbearia não econtrada');

    try {
      const usuario = await this.prisma.usuario.create({
        data: {
          barbeariaId: barbearia.id,
          nome: dto.nome,
          email: normalizarEmail(dto.email),
          telefone: dto.telefone,
          senhaHash: await argon2.hash(dto.senha),
          papel: 'cliente', //cadastro aberto é sempre cliente
        },
      });
      return this.gerarTokens(usuario);
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ConflictException('Email já cadastrado nesta barbearia');
      }
      throw erro;
    }
  }

  async entrar(dto: LoginDto): Promise<TokensRespostaDto> {
    const usuario = await this.prisma.usuario.findFirst({
      where: { email: normalizarEmail(dto.email), barbearia: { slug: dto.slug } },
    });

    const senhaOk = usuario && (await argon2.verify(usuario.senhaHash, dto.senha));
    if (!usuario || !senhaOk) throw new UnauthorizedException('Email ou senha inválidos');

    return this.gerarTokens(usuario);
  }

  private async gerarTokens(usuario: {
    id: string;
    barbeariaId: string;
    papel: string;
  }): Promise<TokensRespostaDto> {
    const accessToken = await this.jwt.signAsync({
      sub: usuario.id,
      barbeariaId: usuario.barbeariaId,
      papel: usuario.papel,
    });
    return { accessToken };
  }
}

function normalizarEmail(email: string) {
  return email.trim().toLowerCase();
}
