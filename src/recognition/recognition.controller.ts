import { Body, BadRequestException, Controller, Post } from '@nestjs/common';
import { RecognitionService } from './recognition.service';

@Controller()
export class RecognitionController {
  constructor(private readonly recognitionService: RecognitionService) {}

  @Post('recognize')
  async recognize(@Body('descriptor') descriptor: number[]) {
    if (!Array.isArray(descriptor) || descriptor.length !== 128) {
      throw new BadRequestException('descriptor must be an array of 128 numbers');
    }

    if (!descriptor.every((value) => typeof value === 'number')) {
      throw new BadRequestException('descriptor must contain only numbers');
    }

    return this.recognitionService.recognize(descriptor);
  }
}
