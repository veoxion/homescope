import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * 전역 예외 필터.
 * - HttpException: 상태 코드/메시지 그대로 전달
 * - Prisma 에러: DB 관련 오류를 사용자 친화적 메시지로 변환
 * - 일반 Error: 500 + 일반 메시지 (스택은 로그에만)
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, errors } = this.extractError(exception);

    // 500번대 에러는 항상 로깅
    if (status >= 500) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `[${request.method} ${request.url}] ${status} — ${message}`,
        stack,
      );
    } else {
      this.logger.warn(
        `[${request.method} ${request.url}] ${status} — ${message}`,
      );
    }

    const body: Record<string, unknown> = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // validation 에러 등 상세 목록이 있을 때만 포함
    if (errors && errors.length > 0) {
      body.errors = errors;
    }

    response.status(status).json(body);
  }

  private extractError(exception: unknown): {
    status: number;
    message: string;
    errors?: string[];
  } {
    // NestJS HttpException (BadRequest, NotFound, Unauthorized 등)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        return { status, message: res };
      }

      const resObj = res as Record<string, unknown>;
      const message =
        typeof resObj.message === 'string'
          ? resObj.message
          : '요청 처리 중 오류가 발생했습니다.';
      const errors = Array.isArray(resObj.message) ? resObj.message : undefined;

      return { status, message: errors ? '입력값이 올바르지 않습니다.' : message, errors };
    }

    // Prisma 에러: 고유 제약 조건 위반
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          status: HttpStatus.CONFLICT,
          message: '이미 존재하는 데이터입니다.',
        };
      }
      if (exception.code === 'P2025') {
        return {
          status: HttpStatus.NOT_FOUND,
          message: '데이터를 찾을 수 없습니다.',
        };
      }
      return {
        status: HttpStatus.BAD_REQUEST,
        message: '데이터베이스 요청 오류가 발생했습니다.',
      };
    }

    // Prisma validation 에러
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: '잘못된 데이터 형식입니다.',
      };
    }

    // 일반 Error
    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: '서버 오류가 발생했습니다.',
      };
    }

    // 알 수 없는 예외
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '서버 오류가 발생했습니다.',
    };
  }
}
