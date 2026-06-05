import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class UploadService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async uploadPhoto(file: Express.Multer.File, itemId: string): Promise<{ url: string }> {
    const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
    if (!file.buffer) {
      throw new InternalServerErrorException('Uploaded file buffer is missing.');
    }

    await this.supabaseService.uploadFileToStorage('fotos', fileName, file.buffer, file.mimetype);
    const publicUrl = this.supabaseService.getPublicUrl('fotos', fileName);
    await this.supabaseService.updateItemEmbeddingUrl(itemId, publicUrl);

    return { url: publicUrl };
  }
}
