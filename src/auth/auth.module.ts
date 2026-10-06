import { Module } from '@nestjs/common';
import { SupabaseModule } from '../common/supabase/supabase.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
