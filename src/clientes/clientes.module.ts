import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../common/supabase/supabase.module';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
