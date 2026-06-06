import { Injectable, InternalServerErrorException, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';
import * as faceapi from 'face-api.js';
import canvas from 'canvas';
import * as path from 'node:path';
// Load TensorFlow dynamically: prefer native tfjs-node, fallback to pure JS @tensorflow/tfjs
let tf: any;
let usingTfNode = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  tf = require('@tensorflow/tfjs-node');
  usingTfNode = true;
} catch (e) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  tf = require('@tensorflow/tfjs');
  usingTfNode = false;
}
import { SupabaseService } from '../common/supabase/supabase.service';

const { Canvas, Image, ImageData, loadImage } = canvas;
faceapi.env.monkeyPatch({
  Canvas: Canvas as any,
  Image: Image as any,
  ImageData: ImageData as any,
  fetch: fetch as any,
});
// Configure backend: use native 'tensorflow' backend when tfjs-node is available,
// otherwise use CPU backend from @tensorflow/tfjs.
try {
  if (usingTfNode && typeof tf.setBackend === 'function') {
    tf.setBackend('tensorflow');
  } else if (typeof tf.setBackend === 'function') {
    tf.setBackend('cpu');
  }
} catch (e) {
  // ignore backend set errors
}
// Expose tf to face-api
(faceapi as any).tf = tf;

@Injectable()
export class RecognitionService implements OnApplicationBootstrap {
  private isModelsLoaded = false;
  private readonly descriptorCache = new Map<string, number[]>();
  private readonly candidateCacheTtlMs = 60_000;
  private candidateCache:
    | {
        timestamp: number;
        candidates: Array<{ id: string; nombre: string; embending: string; descriptor: number[] }>;
      }
    | null = null;
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
      if (distance <= this.threshold && (bestMatch === null || distance < bestMatch.distance)) {
        bestMatch = {
          id: item.id,
          nombre: item.nombre,
          embending: item.embending,
          distance,
        };
      }
    }

    if (!bestMatch) {
      throw new NotFoundException('No matching cliente found');
    }
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

    // Load models using face-api.js with tfjs-node backend for faster inference
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);

    this.isModelsLoaded = true;
  }

  private async getCandidateDescriptors() {
    const now = Date.now();
    if (this.cacheEnabled && this.candidateCache && now - this.candidateCache.timestamp < this.candidateCacheTtlMs) {
      return this.candidateCache.candidates;
    }

    const clientes = await this.supabaseService.getClientesWithEmbending();
    const candidates = await Promise.all(
      clientes.map(async (cliente) => {
        const storedDescriptor = this.parseDescriptor(cliente.descriptor);
        if (storedDescriptor) {
          return { ...cliente, descriptor: storedDescriptor };
        }

        if (!cliente.embending) {
          return null;
        }

        const candidateDescriptor = await this.getDescriptorForEmbending(cliente.embending);
        if (!candidateDescriptor) {
          return null;
        }

        return { ...cliente, descriptor: candidateDescriptor };
      }),
    );

    const filteredCandidates = candidates.filter(
      (item): item is { id: string; nombre: string; embending: string; descriptor: number[] } =>
        Boolean(item && Array.isArray(item.descriptor)),
    );

    if (this.cacheEnabled) {
      this.candidateCache = { timestamp: now, candidates: filteredCandidates };
    }

    return filteredCandidates;
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
      let detection = await faceapi
        .detectSingleFace(canvasImage, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection?.descriptor) {
        const detections = await faceapi
          .detectAllFaces(canvasImage, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (detections.length > 0) {
          detection = detections[0];
        }
      }

      if (!detection?.descriptor) {
        return null;
      }

      const descriptorArray = Array.from(
        detection.descriptor as Float32Array,
      ) as number[];
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
