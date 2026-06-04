import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch, { Headers } from 'node-fetch';

@Injectable()
export class SupabaseService {
  private readonly url: string;
  private readonly anonKey: string;
  private readonly serviceRoleKey: string;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService
      .get<string>('SUPABASE_URL')
      ?.replace(/\/+$/, '') ?? '';
    this.anonKey = this.configService.get<string>('SUPABASE_ANON_KEY') ?? '';
    this.serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_KEY') ?? '';

    if (!this.url || !this.anonKey) {
      throw new InternalServerErrorException(
        'SUPABASE_URL and SUPABASE_ANON_KEY must be configured in environment variables.',
      );
    }
  }

  async request<T>(
    path: string,
    options: RequestInit,
    userToken?: string,
  ): Promise<T> {
    const headers = new Headers({
      apikey: this.anonKey,
      'Content-Type': 'application/json',
      ...((options.headers ?? {}) as Record<string, string>),
    });

    if (userToken) {
      headers.set('Authorization', `Bearer ${userToken}`);
    } else if (this.serviceRoleKey) {
      headers.set('Authorization', `Bearer ${this.serviceRoleKey}`);
      headers.set('apikey', this.serviceRoleKey);
    }

    const requestBody =
      options.body != null && typeof options.body !== 'string'
        ? JSON.stringify(options.body)
        : options.body;

    const response = await fetch(`${this.url}${path}`, {
      ...options,
      headers,
      body: requestBody,
    });

    const text = await response.text();
    const responseBody = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new InternalServerErrorException(
        `Supabase request failed: ${response.status} ${response.statusText} - ${JSON.stringify(responseBody)}`,
      );
    }

    return responseBody as T;
  }
}
