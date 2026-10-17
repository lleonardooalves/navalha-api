import { ApiProperty } from '@nestjs/swagger';

export class PerfilDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'João Silva' })
  nome: string;

  @ApiProperty({ example: 'joao@email.com' })
  email: string;

  @ApiProperty({ type: String, nullable: true, example: '11999998888' })
  telefone: string | null;

  @ApiProperty({ enum: ['cliente', 'barbeiro', 'dono'] })
  papel: 'cliente' | 'barbeiro' | 'dono';
}
