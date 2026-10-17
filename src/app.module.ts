import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { DisponibilidadeModule } from './disponibilidade/disponibilidade.module';
import { AgendamentosModule } from './agendamentos/agendamentos.module';
import { BarbeariasModule } from './barbearias/barbearias.module';
import { AuthModule } from './auth/auth.module';
import { MeModule } from './auth/me.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    DisponibilidadeModule,
    AgendamentosModule,
    BarbeariasModule,
    AuthModule,
    MeModule,
  ],
})
export class AppModule {}
