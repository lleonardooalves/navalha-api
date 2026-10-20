import { ApiProperty } from '@nestjs/swagger';

export class TokensRespostaDto {
  @ApiProperty({ description: 'JWT para o header Authorization: Bearer <token>' })
  accessToken: string;

  @ApiProperty({ description: 'Vale 30 dias e só pode ser usado uma vez, em POST /auth/renovar' })
  refreshToken: string;
}
