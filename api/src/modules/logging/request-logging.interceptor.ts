import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { LoggingService } from './logging.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly loggingService: LoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
  tap((responseBody: unknown) => {
        void this.loggingService.recordRequest({
          method: request.method,
          url: request.originalUrl ?? request.url,
          status: response.statusCode,
          durationMs: Date.now() - startedAt,
          requestHeaders: { ...request.headers },
          requestBody: request.body,
          responseHeaders: response.getHeaders() as Record<string, unknown>,
          responseBody
        });
      }),
  catchError((error: unknown) => {
        void this.loggingService.recordRequest({
          method: request.method,
          url: request.originalUrl ?? request.url,
          status: this.extractStatusCode(error, response),
          durationMs: Date.now() - startedAt,
          requestHeaders: { ...request.headers },
          requestBody: request.body,
          responseHeaders: response.getHeaders() as Record<string, unknown>,
          error
        });
        throw error;
      })
    );
  }

  private extractStatusCode(error: unknown, response: Response): number | undefined {
    if (typeof (error as { status?: number })?.status === 'number') {
      return (error as { status?: number }).status;
    }

    return response.statusCode;
  }
}
