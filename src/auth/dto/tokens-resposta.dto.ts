import { ApiProperty } from '@nestjs/swagger';

export class TokensRespostaDto {
  @ApiProperty({ description: 'JWT para o header Authorization: Bearer <token>' })
  accessToken: string;
}
