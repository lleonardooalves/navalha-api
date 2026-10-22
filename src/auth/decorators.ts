import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { UsuarioToken } from './usuario-token';
import { PapelUsuario } from '../generated/prisma/enums';

export const PUBLICO = 'publico';
export const Publico = () => SetMetadata(PUBLICO, true);

export const UsuarioAtual = createParamDecorator(
  (_dados: unknown, contexto: ExecutionContext): UsuarioToken =>
    contexto.switchToHttp().getRequest<{ usuario: UsuarioToken }>().usuario,
);

export const PAPEIS = 'papeis';
export const Papeis = (...papeis: PapelUsuario[]) => SetMetadata(PAPEIS, papeis);
