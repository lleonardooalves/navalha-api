import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { DisponibilidadeModule } from './disponibilidade/disponibilidade.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, DisponibilidadeModule],
})
export class AppModule {}
