import { Module } from '@nestjs/common';
import { DonoService } from './dono.service';
import { DonoController } from './dono.controller';
import { BarbeiroModule } from '../barbeiro/barbeiro.module';
import { AgendamentosModule } from '../agendamentos/agendamentos.module';

@Module({
  imports: [BarbeiroModule, AgendamentosModule],
  providers: [DonoService],
  controllers: [DonoController],
})
export class DonoModule {}
