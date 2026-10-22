import { Module } from '@nestjs/common';
import { BarbeiroController } from './barbeiro.controller';
import { BarbeiroService } from './barbeiro.service';

@Module({
  controllers: [BarbeiroController],
  providers: [BarbeiroService],
})
export class BarbeiroModule {}
