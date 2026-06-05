import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';

@Controller('api')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('upload-photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async uploadPhoto(
    @UploadedFile() photo: Express.Multer.File,
    @Body('itemId') itemId: string,
  ) {
    if (!photo) {
      throw new BadRequestException('photo file is required');
    }

    if (!itemId || !itemId.trim()) {
      throw new BadRequestException('itemId is required');
    }

    if (!['image/jpeg', 'image/png'].includes(photo.mimetype)) {
      throw new BadRequestException('Only JPG and PNG images are allowed');
    }

    if (!photo.buffer || photo.buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty or could not be read');
    }

    return this.uploadService.uploadPhoto(photo, itemId.trim());
  }
}
