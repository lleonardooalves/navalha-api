import { Module } from '@nestjs/common';
import { DonoService } from './dono.service';
import { DonoController } from './dono.controller';
import { BarbeiroModule } from '../barbeiro/barbeiro.module';

@Module({
  imports: [BarbeiroModule],
  providers: [DonoService],
  controllers: [DonoController],
})
export class DonoModule {}
