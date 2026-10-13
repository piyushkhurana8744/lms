export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'ERR_INTERNAL_SERVER', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details?: any) {
    super(message, 400, 'ERR_BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access', details?: any) {
    super(message, 401, 'ERR_UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access', details?: any) {
    super(message, 403, 'ERR_FORBIDDEN', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Requested resource not found', details?: any) {
    super(message, 404, 'ERR_NOT_FOUND', details);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error occurred', details?: any) {
    super(message, 500, 'ERR_INTERNAL_SERVER', details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details?: any) {
    super(message, 409, 'ERR_CONFLICT', details);
  }
}
