export interface NormalizedAppError {
  title: string;
  message: string;
  statusCode?: number;
  code?: string;
  retryable?: boolean;
  technicalDetails?: string;
  fieldErrors?: Record<string, string>;
}

export interface ShowErrorInput {
  title?: string;
  message?: string;
  statusCode?: number;
  code?: string;
  retryable?: boolean;
  retry?: () => void | Promise<any>;
  technicalDetails?: string;
  fieldErrors?: Record<string, string>;
  error?: unknown;
}

/**
 * Maps HTTP status codes to user-friendly default messages
 */
export function getStatusFallbackMessage(status: number): { title: string; message: string; retryable: boolean } {
  switch (status) {
    case 400:
      return {
        title: 'Invalid Request',
        message: 'Please check the information you entered and try again.',
        retryable: false
      };
    case 401:
      return {
        title: 'Session Expired',
        message: 'Your session has expired. Please log in again.',
        retryable: false
      };
    case 403:
      return {
        title: 'Permission Denied',
        message: "You don't have permission to perform this action.",
        retryable: false
      };
    case 404:
      return {
        title: 'Resource Not Found',
        message: 'The requested resource could not be found.',
        retryable: false
      };
    case 409:
      return {
        title: 'Data Conflict',
        message: 'This action conflicts with existing data. Please refresh and try again.',
        retryable: true
      };
    case 413:
      return {
        title: 'File Too Large',
        message: 'The uploaded file exceeds the maximum allowed size limit.',
        retryable: false
      };
    case 422:
      return {
        title: 'Validation Error',
        message: 'Some information is invalid. Please review the form and try again.',
        retryable: false
      };
    case 429:
      return {
        title: 'Too Many Requests',
        message: 'Too many requests. Please wait a moment and try again.',
        retryable: true
      };
    case 500:
      return {
        title: 'Server Error',
        message: 'Our server encountered a problem. Please try again later.',
        retryable: true
      };
    case 502:
    case 503:
    case 504:
      return {
        title: 'Service Unavailable',
        message: 'The service is temporarily unavailable. Please try again shortly.',
        retryable: true
      };
    default:
      return {
        title: 'Something Went Wrong',
        message: 'We couldn\'t complete your request. Please try again.',
        retryable: true
      };
  }
}

/**
 * Centralized Error Normalizer
 * Converts any unknown error, API response object, fetch Error, or Zod error into NormalizedAppError.
 * Preserves safe backend custom messages when available.
 */
export function normalizeError(input: unknown, defaultTitle?: string): NormalizedAppError {
  if (!input) {
    return {
      title: defaultTitle || 'Something Went Wrong',
      message: 'An unknown error occurred. Please try again.',
      retryable: true
    };
  }

  // Already normalized
  if (typeof input === 'object' && input !== null && 'title' in input && 'message' in input && typeof (input as any).message === 'string' && typeof (input as any).title === 'string') {
    return input as NormalizedAppError;
  }

  let statusCode: number | undefined = undefined;
  let code: string | undefined = undefined;
  let message: string | undefined = undefined;
  let technicalDetails: string | undefined = undefined;
  let fieldErrors: Record<string, string> | undefined = undefined;

  const errObj = input as any;

  // Handle standard Error instance
  if (input instanceof Error) {
    technicalDetails = input.stack;
    message = input.message;

    // Check network / timeout specific messages
    if (input.name === 'AbortError' || input.message.toLowerCase().includes('timeout')) {
      return {
        title: 'Request Timeout',
        message: 'The request took too long. Please try again.',
        statusCode: 408,
        code: 'TIMEOUT',
        retryable: true,
        technicalDetails
      };
    }
    if (input.message.toLowerCase().includes('failed to fetch') || input.message.toLowerCase().includes('networkerror') || input.message.toLowerCase().includes('network error')) {
      return {
        title: 'Connection Problem',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        code: 'NETWORK_ERROR',
        retryable: true,
        technicalDetails
      };
    }
  }

  // Handle Axios or Fetch API response objects
  if (errObj.response) {
    statusCode = errObj.response.status || errObj.status;
    const responseData = errObj.response.data || errObj.data;

    if (responseData) {
      if (typeof responseData === 'string') {
        message = responseData;
      } else if (typeof responseData === 'object') {
        // Backend pattern: { success: false, error: { code, message, details }, message, code }
        if (responseData.error && typeof responseData.error === 'object') {
          message = responseData.error.message || responseData.error.msg;
          code = responseData.error.code;
          if (responseData.error.details && typeof responseData.error.details === 'object') {
            fieldErrors = responseData.error.details;
          }
        }

        if (!message) {
          message = responseData.message || responseData.msg;
        }
        if (!code) {
          code = responseData.code;
        }
        if (responseData.errors && typeof responseData.errors === 'object') {
          fieldErrors = responseData.errors;
        }
      }
    }
  } else if (errObj.status || errObj.statusCode) {
    statusCode = errObj.status || errObj.statusCode;
    message = errObj.message;
    code = errObj.code;
  }

  // String error
  if (typeof input === 'string') {
    message = input;
  }

  // If status code is present but message is not custom, derive status defaults
  const fallback = statusCode ? getStatusFallbackMessage(statusCode) : getStatusFallbackMessage(500);

  const title = defaultTitle || (statusCode ? fallback.title : 'Something Went Wrong');
  const finalMessage = message && message.trim().length > 0 ? message : fallback.message;
  const retryable = statusCode ? fallback.retryable : true;

  return {
    title,
    message: finalMessage,
    statusCode,
    code,
    retryable,
    technicalDetails: technicalDetails || (typeof input === 'object' ? JSON.stringify(input, null, 2) : String(input)),
    fieldErrors
  };
}
