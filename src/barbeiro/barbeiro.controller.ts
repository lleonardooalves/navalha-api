import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Papeis, UsuarioAtual } from '../auth/decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { BarbeiroService } from './barbeiro.service';
import { AgendaBarbeiroDto, BloqueioDto, ConsultarAgendaDto } from './dto/agenda-barbeiro.dto';
import type { UsuarioToken } from '../auth/usuario-token';
import { CriarBloqueioDto } from './dto/criar-bloqueio.dto';

@ApiTags('barbeiro')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sem login' })
@ApiForbiddenResponse({ description: 'Não é barbeiro' })
@Papeis('barbeiro', 'dono')
@Controller('barbeiro')
export class BarbeiroController {
  constructor(private readonly barbeiro: BarbeiroService) {}

  @Get('agenda')
  @ApiOkResponse({ type: AgendaBarbeiroDto })
  agenda(
    @UsuarioAtual() usuario: UsuarioToken,
    @Query() consulta: ConsultarAgendaDto,
  ): Promise<AgendaBarbeiroDto> {
    return this.barbeiro.agenda(usuario, consulta.data);
  }

  @Post('bloqueios')
  @ApiCreatedResponse({ type: BloqueioDto })
  @ApiUnprocessableEntityResponse({
    description: 'Horário, já passou, tem agendamento ou já está bloqueado',
  })
  criarBloqueio(
    @UsuarioAtual() usuario: UsuarioToken,
    @Body() dto: CriarBloqueioDto,
  ): Promise<BloqueioDto> {
    return this.barbeiro.criarBloqueio(usuario, dto);
  }

  @Delete('bloqueios/:id')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Bloqueio removido' })
  @ApiNotFoundResponse({ description: 'Bloqueio não encontrado' })
  removerBloqueio(
    @UsuarioAtual() usuario: UsuarioToken,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.barbeiro.removerBloqueio(usuario, id);
  }
}
