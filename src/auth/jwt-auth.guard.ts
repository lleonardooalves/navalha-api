import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuarioToken } from './usuario-token';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PUBLICO } from './decorators';
import { Request } from 'express';

type Payload = { sub: string; barbeariaId: string; papel: UsuarioToken['papel'] };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    //rota marcada com publico passa direto
    const publico = this.reflector.getAllAndOverride<boolean>(PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (publico) return true;

    const requisicao = contexto.switchToHttp().getRequest<Request & { usuario?: UsuarioToken }>();

    const [tipo, token] = requisicao.headers.authorization?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token) throw new UnauthorizedException();

    try {
      const payload = await this.jwt.verifyAsync<Payload>(token);
      requisicao.usuario = {
        id: payload.sub,
        barbeariaId: payload.barbeariaId,
        papel: payload.papel,
      };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
