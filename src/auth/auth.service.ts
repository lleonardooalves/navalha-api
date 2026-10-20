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
import { createHash, randomBytes } from 'node:crypto';

const REFRESH_DIAS = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async cadastrar(dto: CadastroDto): Promise<TokensRespostaDto> {
    const barbearia = await this.prisma.barbearia.findUnique({ where: { slug: dto.slug } });
    if (!barbearia) throw new NotFoundException('Barbearia não encontrada');

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

  async renovar(refreshToken: string): Promise<TokensRespostaDto> {
    const sessao = await this.prisma.sessao.findUnique({
      where: { tokenHash: hashDoToken(refreshToken) },
      include: { usuario: true },
    });
    if (!sessao) throw new UnauthorizedException('Sessão Inválida');

    //token usado sendo usado denovo provavelmente foi roubado então derruba todas sessões do usuário
    if (sessao.revogadaEm) {
      await this.prisma.sessao.updateMany({
        where: { usuarioId: sessao.usuarioId, revogadaEm: null },
        data: { revogadaEm: new Date() },
      });
      throw new UnauthorizedException('Sessão inválida');
    }

    if (sessao.expiraEm <= new Date()) throw new UnauthorizedException('Sessão expirada');

    // revoga a sessão atual; o "revogadaEm: null" no where faz o banco
    // garantir que, entre duas renovações simultâneas, só uma vence
    const { count } = await this.prisma.sessao.updateMany({
      where: { id: sessao.id, revogadaEm: null },
      data: { revogadaEm: new Date() },
    });

    if (count === 0) throw new UnauthorizedException('Sessão inválida');

    return this.gerarTokens(sessao.usuario);
  }

  async sair(refreshToken: string): Promise<void> {
    await this.prisma.sessao.updateMany({
      where: { tokenHash: hashDoToken(refreshToken), revogadaEm: null },
      data: { revogadaEm: new Date() },
    });
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

    const refreshToken = randomBytes(32).toString('base64url');
    await this.prisma.sessao.create({
      data: {
        barbeariaid: usuario.barbeariaId,
        usuarioId: usuario.id,
        tokenHash: hashDoToken(refreshToken),
        expiraEm: new Date(Date.now() + REFRESH_DIAS * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken };
  }
}

function normalizarEmail(email: string) {
  return email.trim().toLowerCase();
}

// o refresh token é aleatório e longo, então SHA-256 basta (e permite buscar pelo hash)
function hashDoToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
