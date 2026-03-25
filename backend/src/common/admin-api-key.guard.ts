import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(AdminApiKeyGuard.name);
  private warned = false;

  canActivate(context: ExecutionContext): boolean {
    const apiKey = process.env.ADMIN_API_KEY;
    if (!apiKey) {
      if (!this.warned) {
        this.logger.warn(
          'ADMIN_API_KEY가 설정되지 않았습니다. 프로덕션 환경에서는 반드시 설정하세요. 현재 모든 관리자 요청이 허용됩니다.',
        );
        this.warned = true;
      }
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-admin-api-key'];

    if (provided !== apiKey) {
      throw new UnauthorizedException('유효하지 않은 관리자 API 키입니다.');
    }
    return true;
  }
}
