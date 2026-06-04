import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: any = context.switchToHttp().getRequest();
    const authorization = request.headers?.authorization;
    const token = this.extractToken(authorization);

    if (!token) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const user: any = await this.authService.getUser(token);
    if (!user || !user.user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.user = user.user;
    return true;
  }

  private extractToken(authHeader?: string | string[]): string | null {
    if (!authHeader || Array.isArray(authHeader)) {
      return null;
    }

    const matches = authHeader.match(/^Bearer\s+(.+)$/i);
    return matches ? matches[1] : null;
  }
}
