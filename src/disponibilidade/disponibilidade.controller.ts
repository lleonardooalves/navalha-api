import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { DisponibilidadeService } from './disponibilidade.service';
import { DisponibilidadeRespostaDto } from './dto/disponibilidade-resposta.dto';
import { ConsultarDisponibilidadeDto } from './dto/consultar-disponibilidade.dto';

@ApiTags('disponibilidade')
@Controller('disponibilidade')
export class DisponibilidadeController {
  constructor(private readonly disponibilidade: DisponibilidadeService) {}

  @Get()
  @ApiOkResponse({ type: DisponibilidadeRespostaDto })
  async consultar(
    @Query() consulta: ConsultarDisponibilidadeDto,
  ): Promise<DisponibilidadeRespostaDto> {
    const horarios = await this.disponibilidade.buscar(consulta);
    return { data: consulta.data, horarios };
  }
}
