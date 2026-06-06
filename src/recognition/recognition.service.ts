import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class RecognitionService {
  private readonly candidateCacheTtlMs = 60_000;
  private candidateCache:
    | {
        timestamp: number;
        candidates: Array<{ id: string; nombre: string; embending: string; descriptor: number[] }>;
      }
    | null = null;
  private readonly threshold: number;
  private readonly cacheEnabled: boolean;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.threshold = Number(
      this.configService.get<string>('FACE_RECOGNITION_THRESHOLD') ?? '0.6',
    );
    this.cacheEnabled =
      this.configService.get<string>('FACE_RECOGNITION_CACHE') !== 'false';
  }
  async recognize(descriptor: number[]): Promise<{ access: boolean; user?: any; confidence?: number; distance?: number }> {
    try {
      const candidateList = await this.getCandidateDescriptors();

      let bestMatch:
        | {
            id: string;
            nombre: string;
            embending: string;
            distance: number;
          }
        | null = null;

      for (const item of candidateList) {
        const distance = this.calculateDistance(descriptor, item.descriptor);
        if (bestMatch === null || distance < bestMatch.distance) {
          bestMatch = {
            id: item.id,
            nombre: item.nombre,
            embending: item.embending,
            distance,
          };
        }
      }

      if (!bestMatch) {
        return { access: false };
      }

      const allowed = bestMatch.distance < this.threshold;
      const confidence = Math.max(0, 1 - bestMatch.distance);

      if (allowed) {
        console.log(`Acceso autorizado: "${bestMatch.nombre}"`);
        return {
          access: true,
          user: {
            id: bestMatch.id,
            nombre: bestMatch.nombre,
            embending: bestMatch.embending,
          },
          confidence,
          distance: bestMatch.distance,
        };
      }

      return { access: false, confidence, distance: bestMatch.distance };
    } catch (error) {
      console.error('❌ Error in recognize:', error);
      throw error;
    }
  }

  private async getCandidateDescriptors() {
    const now = Date.now();
    if (this.cacheEnabled && this.candidateCache && now - this.candidateCache.timestamp < this.candidateCacheTtlMs) {
      return this.candidateCache.candidates;
    }

    const clientes = await this.supabaseService.getClientesWithEmbending();

    const candidates = clientes
      .map((cliente) => {
        const storedDescriptor = this.parseDescriptor(cliente.descriptor);
        if (storedDescriptor) {
          return { ...cliente, descriptor: storedDescriptor };
        }
        return null;
      })
      .filter(
        (item): item is { id: string; nombre: string; embending: string; descriptor: number[] } =>
          Boolean(item && Array.isArray(item.descriptor)),
      );

    if (this.cacheEnabled) {
      this.candidateCache = { timestamp: now, candidates };
    }

    return candidates;
  }

  private parseDescriptor(descriptor: any): number[] | null {
    if (Array.isArray(descriptor) && descriptor.every((value) => typeof value === 'number')) {
      return descriptor;
    }

    if (typeof descriptor === 'string') {
      try {
        const parsed = JSON.parse(descriptor);
        if (Array.isArray(parsed) && parsed.every((value) => typeof value === 'number')) {
          return parsed;
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  

  private calculateDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new InternalServerErrorException('Descriptors must have the same length');
    }

    return Math.sqrt(
      a.reduce((sum, value, index) => {
        const delta = value - b[index];
        return sum + delta * delta;
      }, 0),
    );
  }
}
