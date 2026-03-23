import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const apiKey = process.env.ADMIN_API_KEY;
    if (!apiKey) return true; // 키 미설정 시 개발 모드로 허용

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-admin-api-key'];

    if (provided !== apiKey) {
      throw new UnauthorizedException('유효하지 않은 관리자 API 키입니다.');
    }
    return true;
  }
}
