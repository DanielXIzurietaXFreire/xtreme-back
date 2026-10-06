import {
  Body,
  Controller,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth/v1')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('token')
  async signIn(
    @Query('grant_type') grantType: string,
    @Body() body: { email: string; password: string },
  ) {
    if (grantType !== 'password') {
      throw new UnauthorizedException('grant_type must be password');
    }
    return this.authService.signIn(body);
  }
}
