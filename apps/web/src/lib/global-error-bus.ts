type ErrorHandlerCallback = (error: unknown, retry?: () => void | Promise<any>) => void;

let globalErrorHandler: ErrorHandlerCallback | null = null;

export function registerGlobalErrorHandler(handler: ErrorHandlerCallback | null) {
  globalErrorHandler = handler;
}

export function notifyGlobalError(error: unknown, retry?: () => void | Promise<any>) {
  if (globalErrorHandler) {
    globalErrorHandler(error, retry);
  }
}
