import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseService) {}

  async signUp(credentials: { email: string; password: string }) {
    return this.supabase.request('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async signIn(credentials: { email: string; password: string }) {
    return this.supabase.request('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(token: string) {
    return this.supabase.request(
      '/auth/v1/logout',
      {
        method: 'POST',
      },
      token,
    );
  }

  async getUser(token: string) {
    return this.supabase.request('/auth/v1/user', { method: 'GET' }, token);
  }
}
