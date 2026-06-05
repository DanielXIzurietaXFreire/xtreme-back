import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch, { Headers } from 'node-fetch';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WebSocket } from 'ws';

@Injectable()
export class SupabaseService {
  private readonly url: string;
  private readonly anonKey: string;
  private readonly serviceRoleKey: string;
  private readonly client: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService
      .get<string>('SUPABASE_URL')
      ?.replace(/\/+$/, '') ?? '';
    this.anonKey = this.configService.get<string>('SUPABASE_ANON_KEY') ?? '';
    this.serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_KEY') ?? '';

    if (!this.url || !this.anonKey || !this.serviceRoleKey) {
      throw new InternalServerErrorException(
        'SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_KEY must be configured in environment variables.',
      );
    }

    this.client = createClient(this.url, this.serviceRoleKey, {
      auth: {
        persistSession: false,
      },
      realtime: {
        transport: WebSocket as unknown as any,
      },
    });
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
    } else {
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

  async uploadFileToStorage(
    bucket: string,
    path: string,
    data: Buffer,
    contentType: string,
  ): Promise<void> {
    const { error } = await this.client.storage
      .from(bucket)
      .upload(path, data, {
        contentType,
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(
        `Supabase storage upload failed: ${error.message}`,
      );
    }
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.client.storage.from(bucket).getPublicUrl(path);

    if (!data?.publicUrl) {
      throw new InternalServerErrorException('Public URL was not returned by Supabase.');
    }

    return data.publicUrl;
  }

  async updateItemEmbeddingUrl(itemId: string, url: string): Promise<void> {
    const { error, data } = await this.client
      .from('items')
      .update({ embending: url })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116' || error.code === 'PGRST117') {
        throw new NotFoundException(`Item with id "${itemId}" was not found.`);
      }
      throw new InternalServerErrorException(
        `Failed to update item: ${error.message}`,
      );
    }

    if (!data) {
      throw new NotFoundException(`Item with id "${itemId}" was not found.`);
    }
  }
}
