import { Module } from '@nestjs/common';
import { BarbeariasController } from './barbearias.controller';
import { BarbeariasService } from './barbearias.service';

@Module({
  controllers: [BarbeariasController],
  providers: [BarbeariasService],
})
export class BarbeariasModule {}
