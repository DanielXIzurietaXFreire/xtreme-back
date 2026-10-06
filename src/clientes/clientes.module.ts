import { Module } from '@nestjs/common';
import { SupabaseModule } from '../common/supabase/supabase.module';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';

@Module({
  imports: [SupabaseModule],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
