import { Injectable, InternalServerErrorException, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';
import * as faceapi from 'modern-face-api';
import canvas from 'canvas';
import * as path from 'node:path';
import { SupabaseService } from '../common/supabase/supabase.service';

const { Canvas, Image, ImageData, loadImage } = canvas;
faceapi.env.monkeyPatch({
  Canvas: Canvas as any,
  Image: Image as any,
  ImageData: ImageData as any,
});
faceapi.tf.setBackend('cpu');

@Injectable()
export class RecognitionService implements OnApplicationBootstrap {
  private isModelsLoaded = false;
  private readonly descriptorCache = new Map<string, number[]>();
  private readonly modelPath: string;
  private readonly threshold: number;
  private readonly cacheEnabled: boolean;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.modelPath =
      this.configService.get<string>('FACE_API_MODELS_PATH') ?? 'models';
    this.threshold = Number(
      this.configService.get<string>('FACE_RECOGNITION_THRESHOLD') ?? '0.6',
    );
    this.cacheEnabled =
      this.configService.get<string>('FACE_RECOGNITION_CACHE') !== 'false';
  }

  async recognize(descriptor: number[]) {
    await this.loadModelsIfNeeded();

    const clientes = await this.supabaseService.getClientesWithEmbending();
    const candidateList = await Promise.all(
      clientes.map(async (cliente) => {
        const storedDescriptor = this.parseDescriptor(cliente.descriptor);
        if (storedDescriptor) {
          return { ...cliente, descriptor: storedDescriptor };
        }

        if (!cliente.embending) {
          return null;
        }

        const candidateDescriptor = await this.getDescriptorForEmbending(
          cliente.embending,
        );
        if (!candidateDescriptor) {
          return null;
        }

        return { ...cliente, descriptor: candidateDescriptor };
      }),
    );

    const matches = candidateList
      .filter((item): item is { id: string; nombre: string; embending: string; descriptor: number[] } =>
        Boolean(item && Array.isArray(item.descriptor)),
      )
      .map((item) => ({
        ...item,
        distance: this.calculateDistance(descriptor, item.descriptor),
      }))
      .filter((item) => item.distance <= this.threshold)
      .sort((a, b) => a.distance - b.distance);

    if (matches.length === 0) {
      throw new NotFoundException('No matching cliente found');
    }

    const bestMatch = matches[0];
    return {
      clienteId: bestMatch.id,
      nombre: bestMatch.nombre,
      embending: bestMatch.embending,
    };
  }

  async onApplicationBootstrap() {
    await this.loadModelsIfNeeded();
  }

  private async loadModelsIfNeeded() {
    if (this.isModelsLoaded) {
      return;
    }

    const modelPath = path.join(process.cwd(), this.modelPath);

    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);

    this.isModelsLoaded = true;
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

  private async getDescriptorForEmbending(url: string): Promise<number[] | null> {
    if (this.cacheEnabled && this.descriptorCache.has(url)) {
      return this.descriptorCache.get(url) ?? null;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }

      const buffer = await response.arrayBuffer();
      const image = await loadImage(Buffer.from(buffer));
      const canvasImage = faceapi.createCanvasFromMedia(image as any);
      const detection = await faceapi
        .detectSingleFace(canvasImage, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection?.descriptor) {
        return null;
      }

      const descriptorArray = Array.from(detection.descriptor);
      if (this.cacheEnabled) {
        this.descriptorCache.set(url, descriptorArray);
      }
      return descriptorArray;
    } catch {
      return null;
    }
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
