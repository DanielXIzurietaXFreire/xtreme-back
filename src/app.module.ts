import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ClientesModule } from './clientes/clientes.module';
import { UploadModule } from './upload/upload.module';
import { HeartbeatController } from './heartbeat.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ClientesModule,
    UploadModule,
  ],
  controllers: [HeartbeatController],
  providers: [],
})
export class AppModule {}
