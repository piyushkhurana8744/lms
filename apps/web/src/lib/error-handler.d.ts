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
    retry?: () => void | Promise<void>;
    technicalDetails?: string;
    fieldErrors?: Record<string, string>;
    error?: unknown;
}
/**
 * Maps HTTP status codes to user-friendly default messages
 */
export declare function getStatusFallbackMessage(status: number): {
    title: string;
    message: string;
    retryable: boolean;
};
/**
 * Centralized Error Normalizer
 * Converts any unknown error, API response object, fetch Error, or Zod error into NormalizedAppError.
 * Preserves safe backend custom messages when available.
 */
export declare function normalizeError(input: unknown, defaultTitle?: string): NormalizedAppError;
//# sourceMappingURL=error-handler.d.ts.map