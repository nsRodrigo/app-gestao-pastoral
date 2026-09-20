import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

/**
 * Filtro global: nunca expõe stack trace ou detalhes internos ao usuário
 * (seção 42). Erros não esperados viram uma mensagem genérica em
 * português, mas são logados integralmente no servidor.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(
        typeof body === "string"
          ? { statusCode: status, message: body, path: request.url }
          : { statusCode: status, path: request.url, ...body },
      );
      return;
    }

    this.logger.error(
      `Erro não tratado em ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Ocorreu um erro inesperado. Tente novamente em instantes.",
      path: request.url,
    });
  }
}
