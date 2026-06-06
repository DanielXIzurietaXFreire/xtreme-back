import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
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

  async registerClienteWithDescriptor(data: {
    nombre: string;
    embending: string;
    descriptor: number[];
  }) {
    // Validar descriptor
    if (!Array.isArray(data.descriptor)) {
      throw new BadRequestException('descriptor debe ser un array de números');
    }

    if (data.descriptor.length !== 128) {
      throw new BadRequestException(
        `descriptor debe contener exactamente 128 elementos, recibido: ${data.descriptor.length}`,
      );
    }

    if (!data.descriptor.every((num) => typeof num === 'number')) {
      throw new BadRequestException('todos los elementos del descriptor deben ser números');
    }

    // Validar otros campos
    if (!data.nombre || typeof data.nombre !== 'string') {
      throw new BadRequestException('nombre es requerido y debe ser un string');
    }

    if (!data.embending || typeof data.embending !== 'string') {
      throw new BadRequestException('embending es requerido y debe ser un string');
    }

    try {
      const result = await this.supabase.request('/rest/v1/clientes', {
        method: 'POST',
        body: JSON.stringify({
          nombre: data.nombre,
          embending: data.embending,
          descriptor: data.descriptor,
        }),
        headers: {
          Prefer: 'return=representation',
        },
      });

      return {
        success: true,
        message: 'Cliente registrado exitosamente',
        data: result,
      };
    } catch (error: unknown) {
      console.error('❌ Error al registrar cliente:', error);
      
      const errorMessage = (error instanceof Error ? error.message : String(error)) || 'Error desconocido al registrar cliente';
      
      // Errores específicos de Supabase
      if (errorMessage.includes('duplicate key')) {
        throw new BadRequestException('El cliente ya existe en la base de datos');
      }

      if (errorMessage.includes('permission denied')) {
        throw new InternalServerErrorException(
          'Permiso denegado en la base de datos. Contacta al administrador.',
        );
      }

      if (errorMessage.includes('connection')) {
        throw new InternalServerErrorException(
          'Error de conexión con la base de datos. Intenta más tarde.',
        );
      }

      throw new InternalServerErrorException(
        `Error al registrar cliente: ${errorMessage}`,
      );
    }
  }
}
