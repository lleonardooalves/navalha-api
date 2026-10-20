import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Publico } from './decorators';
import { AuthService } from './auth.service';
import { TokensRespostaDto } from './dto/tokens-resposta.dto';
import { CadastroDto } from './dto/cadastro.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Publico()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('cadastro')
  @ApiCreatedResponse({ type: TokensRespostaDto })
  @ApiConflictResponse({ description: 'Email já cadastrado nessa barbearia' })
  cadastrar(@Body() dto: CadastroDto): Promise<TokensRespostaDto> {
    return this.auth.cadastrar(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: TokensRespostaDto })
  @ApiUnauthorizedResponse({ description: 'Email ou senha inválidos' })
  entrar(@Body() dto: LoginDto): Promise<TokensRespostaDto> {
    return this.auth.entrar(dto);
  }

  @Post('renovar')
  @HttpCode(200)
  @ApiOkResponse({ type: TokensRespostaDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token inválido, usado ou expirado' })
  renovar(@Body() dto: RefreshTokenDto): Promise<TokensRespostaDto> {
    return this.auth.renovar(dto.refreshToken);
  }

  @Post('sair')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Sessão encerrada' })
  sair(@Body() dto: RefreshTokenDto): Promise<void> {
    return this.auth.sair(dto.refreshToken);
  }
}
