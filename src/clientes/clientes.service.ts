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

  private generateCodigo(): string {
    const prefix = 'Xtreme';
    const random = Math.floor(100000 + Math.random() * 900000).toString();
    return `${prefix}${random}`;
  }

  private encodeValue(value: string): string {
    return encodeURIComponent(value);
  }

  private async ensureClienteExists(cedula: string): Promise<void> {
    const clientes = await this.supabase.request<any[]>(
      `/rest/v1/clientes?select=cedula&cedula=eq.${this.encodeValue(cedula)}`,
      {
        method: 'GET',
      },
    );

    if (!Array.isArray(clientes) || clientes.length === 0) {
      throw new BadRequestException('La cédula no existe en clientes');
    }
  }

  private async ensureCodigoUnico(codigo: string, excludeCedula?: string): Promise<void> {
    const query = `select=id,cedula&codigo=eq.${this.encodeValue(codigo)}`;
    const response = await this.supabase.request<any[]>(
      this.buildPath('/rest/v1/codigo', query),
      {
        method: 'GET',
      },
    );

    const existingCodes = Array.isArray(response) ? response : [];
    const isDuplicate = existingCodes.some((item: any) => item.cedula !== excludeCedula);

    if (isDuplicate) {
      throw new BadRequestException('El código ya existe');
    }
  }

  private handleCodigoError(error: unknown, action: string): never {
    const errorMessage = (error instanceof Error ? error.message : String(error)) || 'Error desconocido';

    if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
      throw new BadRequestException('El código ya existe');
    }

    if (errorMessage.includes('foreign key')) {
      throw new BadRequestException('La cédula no existe en clientes');
    }

    throw new InternalServerErrorException(`Error al ${action}: ${errorMessage}`);
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

  async getCodigo(query?: string) {
    return this.supabase.request(this.buildPath('/rest/v1/codigo', query), {
      method: 'GET',
    });
  }

  async getCodigoByCedula(cedula: string) {
    const normalizedCedula = typeof cedula === 'string' ? cedula.trim() : '';
    if (!normalizedCedula) {
      throw new BadRequestException('cedula es requerida');
    }

    return this.supabase.request(
      `/rest/v1/codigo?select=*&cedula=eq.${this.encodeValue(normalizedCedula)}`,
      {
        method: 'GET',
      },
    );
  }

  async createCodigo(body: { cedula?: string; codigo?: string }) {
    const cedula = typeof body?.cedula === 'string' ? body.cedula.trim() : '';
    if (!cedula) {
      throw new BadRequestException('cedula es requerida');
    }

    await this.ensureClienteExists(cedula);

    const codigo =
      typeof body?.codigo === 'string' && body.codigo.trim() !== ''
        ? body.codigo.trim()
        : this.generateCodigo();

    const existingCodes = await this.supabase.request<any[]>(
      `/rest/v1/codigo?select=*&cedula=eq.${this.encodeValue(cedula)}`,
      {
        method: 'GET',
      },
    );

    const existingCode = Array.isArray(existingCodes) && existingCodes.length > 0 ? existingCodes[0] : null;

    if (existingCode) {
      await this.ensureCodigoUnico(codigo, cedula);

      const payload = {
        codigo,
        updated_at: new Date().toISOString(),
      };

      try {
        return this.supabase.request(
          `/rest/v1/codigo?cedula=eq.${this.encodeValue(cedula)}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
            headers: {
              Prefer: 'return=representation',
            },
          },
        );
      } catch (error: unknown) {
        this.handleCodigoError(error, 'actualizar código');
      }
    }

    await this.ensureCodigoUnico(codigo);

    const payload = {
      cedula,
      codigo,
      usado: false,
      usado_en: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      return this.supabase.request('/rest/v1/codigo', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          Prefer: 'return=representation',
        },
      });
    } catch (error: unknown) {
      this.handleCodigoError(error, 'crear código');
    }
  }

  async updateCodigo(cedula: string, body: { codigo?: string; usado?: boolean; usado_en?: string }) {
    const normalizedCedula = typeof cedula === 'string' ? cedula.trim() : '';
    if (!normalizedCedula) {
      throw new BadRequestException('cedula es requerida');
    }

    const existingCodes = await this.supabase.request<any[]>(
      `/rest/v1/codigo?select=id,cedula&cedula=eq.${this.encodeValue(normalizedCedula)}`,
      {
        method: 'GET',
      },
    );

    if (!Array.isArray(existingCodes) || existingCodes.length === 0) {
      throw new BadRequestException('No existe un código para la cédula enviada');
    }

    const payload: Record<string, unknown> = {};

    if (body?.codigo !== undefined) {
      const codigo = typeof body.codigo === 'string' ? body.codigo.trim() : '';
      if (!codigo) {
        throw new BadRequestException('codigo no puede estar vacío');
      }
      await this.ensureCodigoUnico(codigo, normalizedCedula);
      payload.codigo = codigo;
    }

    if (body?.usado !== undefined) {
      payload.usado = Boolean(body.usado);
      if (Boolean(body.usado) && body?.usado_en === undefined) {
        payload.usado_en = new Date().toISOString();
      } else if (body?.usado_en !== undefined) {
        payload.usado_en = body.usado_en;
      }
    } else if (body?.usado_en !== undefined) {
      payload.usado_en = body.usado_en;
    }

    if (Object.keys(payload).length === 0) {
      throw new BadRequestException('No hay campos válidos para actualizar');
    }

    payload.updated_at = new Date().toISOString();

    try {
      return this.supabase.request(
        this.buildPath('/rest/v1/codigo', `cedula=eq.${this.encodeValue(normalizedCedula)}`),
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
          headers: {
            Prefer: 'return=representation',
          },
        },
      );
    } catch (error: unknown) {
      this.handleCodigoError(error, 'actualizar código');
    }
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
