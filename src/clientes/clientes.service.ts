import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class ClientesService {
  constructor(private readonly supabase: SupabaseService) {}

  private buildPath(path: string, query?: string): string {
    if (!query || query.trim() === '') {
      return path;
    }
    return `${path}?${query}`;
  }

  async createCliente(body: any) {
    return this.supabase.request('/rest/v1/clientes', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        Prefer: 'return=representation',
      },
    });
  }

  async listClientes(query: string | undefined) {
    return this.supabase.request(this.buildPath('/rest/v1/clientes', query), {
      method: 'GET',
    });
  }

  async updateCliente(query: string | undefined, body: any) {
    return this.supabase.request(this.buildPath('/rest/v1/clientes', query), {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: {
        Prefer: 'return=representation',
      },
    });
  }

  async deleteCliente(query: string | undefined) {
    return this.supabase.request(this.buildPath('/rest/v1/clientes', query), {
      method: 'DELETE',
      headers: {
        Prefer: 'return=representation',
      },
    });
  }

  async buscarClientesSimilares(body: any) {
    return this.supabase.request('/rest/v1/rpc/buscar_clientes_similares', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}
