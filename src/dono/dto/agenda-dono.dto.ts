import { ApiProperty } from '@nestjs/swagger';
import { DiaBarbeiroDto } from '../../barbeiro/dto/agenda-barbeiro.dto';

export class ColunaBarbeiroDto extends DiaBarbeiroDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Zé' })
  nome: string;
}

export class AgendaDonoDto {
  @ApiProperty({ example: '2026-10-20' })
  data: string;

  @ApiProperty({ type: [ColunaBarbeiroDto], description: 'Uma coluna por barbeiro ativo' })
  barbeiros: ColunaBarbeiroDto[];
}
