import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PapelUsuario } from '../generated/prisma/enums';
import { PAPEIS } from './decorators';
import { UsuarioToken } from './usuario-token';

@Injectable()
export class PapeisGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const papeis = this.reflector.getAllAndOverride<PapelUsuario[] | undefined>(PAPEIS, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);

    if (!papeis) return true;

    const { usuario } = contexto.switchToHttp().getRequest<{ usuario?: UsuarioToken }>();
    if (!usuario || !papeis.includes(usuario.papel)) {
      throw new ForbiddenException('Sem permissão para esta ação');
    }

    return true;
  }
}
