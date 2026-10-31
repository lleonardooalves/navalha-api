import { Module } from '@nestjs/common';
import { BarbeiroController } from './barbeiro.controller';
import { BarbeiroService } from './barbeiro.service';

@Module({
  controllers: [BarbeiroController],
  providers: [BarbeiroService],
  // o DonoModule usa o agendasDoDia para montar as colunas
  exports: [BarbeiroService],
})
export class BarbeiroModule {}
