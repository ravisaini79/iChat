import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object') {
        message = Array.isArray(res.message) ? res.message.join(', ') : res.message || exception.message;
        code = res.error || res.code || 'HTTP_ERROR';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const payload: ApiResponse = {
      success: false,
      message,
      code,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(payload);
  }
}
