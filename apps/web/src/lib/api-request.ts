export class ApiRequestError extends Error {
  statusCode?: number;
  code: string;
  retryable: boolean;
  technicalDetails?: string;

  constructor(input: {
    message: string;
    code: string;
    statusCode?: number;
    retryable?: boolean;
    technicalDetails?: string;
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = 'ApiRequestError';
    this.statusCode = input.statusCode;
    this.code = input.code;
    this.retryable = input.retryable ?? true;
    this.technicalDetails = input.technicalDetails;
  }
}

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string; details?: unknown } | string;
  message?: string;
};

function responseRequestId(response: Response): string | undefined {
  return response.headers.get('cf-ray') || response.headers.get('x-request-id') || undefined;
}

/**
 * Fetches a JSON API envelope without hiding gateway, Cloudflare, or backend
 * failures behind JSON parsing errors.
 */
export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (cause) {
    const browserMessage = cause instanceof Error ? cause.message : String(cause);
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    throw new ApiRequestError({
      message: offline
        ? 'Your device is offline. Reconnect to the internet and try again.'
        : 'The LMS API could not be reached. The request failed before any MongoDB or R2 response was received; check the API server, reverse proxy/Cloudflare route, and CORS configuration.',
      code: offline ? 'CLIENT_OFFLINE' : 'API_UNREACHABLE',
      technicalDetails: `${init?.method || 'GET'} ${url}: ${browserMessage}`,
      cause
    });
  }

  const contentType = response.headers.get('content-type') || '';
  const requestId = responseRequestId(response);
  const rawBody = await response.text();
  let payload: ApiEnvelope<T> | undefined;

  if (rawBody && contentType.includes('json')) {
    try {
      payload = JSON.parse(rawBody) as ApiEnvelope<T>;
    } catch {
      // The diagnostic below reports malformed JSON with the HTTP source.
    }
  }

  if (!response.ok) {
    const backendError = payload?.error;
    const backendMessage = typeof backendError === 'object' ? backendError?.message : undefined;
    const backendCode = typeof backendError === 'object' ? backendError?.code : undefined;
    const cloudflareFailure = response.status >= 520 && response.status <= 527;
    const gatewayFailure = [502, 504].includes(response.status);
    const source = cloudflareFailure ? 'Cloudflare edge' : gatewayFailure ? 'API gateway/upstream' : 'LMS API';
    const code = backendCode || (cloudflareFailure ? 'CLOUDFLARE_UPSTREAM_ERROR' : gatewayFailure ? 'API_GATEWAY_ERROR' : `HTTP_${response.status}`);
    const detailSuffix = ` (${source}, HTTP ${response.status}${requestId ? `, request ${requestId}` : ''}, code ${code})`;

    throw new ApiRequestError({
      message: `${backendMessage || payload?.message || `${source} rejected the request`}${detailSuffix}`,
      statusCode: response.status,
      code,
      retryable: response.status >= 500 || response.status === 429,
      technicalDetails: `${init?.method || 'GET'} ${url}\nContent-Type: ${contentType || 'missing'}\nResponse: ${rawBody.slice(0, 1000)}`
    });
  }

  if (!payload) {
    throw new ApiRequestError({
      message: `The LMS API returned an invalid non-JSON response (HTTP ${response.status}${requestId ? `, request ${requestId}` : ''}). Check the reverse proxy route.`,
      statusCode: response.status,
      code: 'INVALID_API_RESPONSE',
      technicalDetails: `${init?.method || 'GET'} ${url}\nContent-Type: ${contentType || 'missing'}\nResponse: ${rawBody.slice(0, 1000)}`
    });
  }

  return payload.data as T;
}
