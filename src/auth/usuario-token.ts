import { PapelUsuario } from '../generated/prisma/enums';

export type UsuarioToken = {
  id: string;
  barbeariaId: string;
  papel: PapelUsuario;
};
