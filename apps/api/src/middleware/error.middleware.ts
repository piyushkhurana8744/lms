import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '@edtech/utils';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): Response {
  logger.error(`[API Error] ${req.method} ${req.originalUrl}: ${err.message}`, err);

  // 1. Operational Application Errors
  if (err instanceof AppError) {
    return ApiResponse.error(res, err.message, err.statusCode, err.code, err.details);
  }

  // 2. Zod Validation Errors
  if (err instanceof ZodError || err?.name === 'ZodError' || Array.isArray(err?.issues)) {
    const formattedDetails = (err.errors || err.issues).map((e: any) => ({
      field: e.path.join('.'),
      issue: e.message
    }));
    return ApiResponse.error(res, 'Validation error occurred', 400, 'ERR_VALIDATION', formattedDetails);
  }

  // 3. Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    return ApiResponse.error(res, 'Database validation failure', 400, 'ERR_MONGO_VALIDATION', err.errors);
  }

  // 4. Mongoose Duplicate Key Errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'resource';
    return ApiResponse.error(res, `Duplicate key value for ${field}`, 409, 'ERR_DUPLICATE_KEY');
  }

  // 5. Fallback Unknown Unhandled Errors
  const message = process.env.NODE_ENV === 'production' ? 'An unexpected internal server error occurred' : err.message;
  return ApiResponse.error(res, message, 500, 'ERR_INTERNAL_SERVER');
}
