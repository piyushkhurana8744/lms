import { Response } from 'express';

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, any>;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode = 200,
    meta?: Record<string, any>
  ): Response {
    const payload: ApiSuccessEnvelope<T> = {
      success: true,
      data,
      ...(message ? { message } : {}),
      ...(meta ? { meta } : {})
    };
    return res.status(statusCode).json(payload);
  }

  static error(
    res: Response,
    message: string,
    statusCode = 500,
    code = 'ERR_INTERNAL_SERVER',
    details?: any
  ): Response {
    const payload: ApiErrorEnvelope = {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {})
      }
    };
    return res.status(statusCode).json(payload);
  }
}
