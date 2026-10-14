import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { DisponibilidadeModule } from './disponibilidade/disponibilidade.module';
import { AgendamentosModule } from './agendamentos/agendamentos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    DisponibilidadeModule,
    AgendamentosModule,
  ],
})
export class AppModule {}
