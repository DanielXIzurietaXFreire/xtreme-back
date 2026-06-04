import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth/v1')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signUp(@Body() body: { email: string; password: string }) {
    return this.authService.signUp(body);
  }

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

  @Post('logout')
  logout(@Headers('authorization') authorization?: string) {
    const token = this.extractToken(authorization);
    if (!token) {
      throw new UnauthorizedException('Bearer token required for logout');
    }
    return this.authService.logout(token);
  }

  @Get('user')
  getUser(@Headers('authorization') authorization?: string) {
    const token = this.extractToken(authorization);
    if (!token) {
      throw new UnauthorizedException('Bearer token required');
    }
    return this.authService.getUser(token);
  }

  private extractToken(authHeader?: string | string[]): string | null {
    if (!authHeader || Array.isArray(authHeader)) {
      return null;
    }

    const matches = authHeader.match(/^Bearer\s+(.+)$/i);
    return matches ? matches[1] : null;
  }
}
