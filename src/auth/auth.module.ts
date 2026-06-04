import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SupabaseService } from '../common/supabase/supabase.service';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [AuthService, SupabaseService],
  exports: [AuthService, SupabaseService],
})
export class AuthModule {}
