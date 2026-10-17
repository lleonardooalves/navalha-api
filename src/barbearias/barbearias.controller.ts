import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { BarbeariasService } from './barbearias.service';
import { BarbeariaRespostaDto } from './dto/barbearia-resposta.dto';
import { Publico } from '../auth/decorators';

@ApiTags('barbearias')
@Publico()
@Controller('barbearias')
export class BarbeariasController {
  constructor(private readonly barbearias: BarbeariasService) {}

  @Get(':slug')
  @ApiOkResponse({ type: BarbeariaRespostaDto })
  @ApiNotFoundResponse({ description: 'Barbearia não econtrada' })
  buscar(@Param('slug') slug: string): Promise<BarbeariaRespostaDto> {
    return this.barbearias.buscarPorSlug(slug);
  }
}
