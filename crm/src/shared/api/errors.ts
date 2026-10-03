export interface ApiErrorOptions {
  status: number;
  code?: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.requestId = options.requestId;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  // Compatibility getter for code expecting FastAPI `error.detail`
  get detail(): unknown {
    return this.details;
  }

  static isApiError(err: unknown): err is ApiError {
    return err instanceof ApiError;
  }

  static fromResponse(status: number, data: unknown, requestId?: string): ApiError {
    let message = `Request failed with status ${status}`;
    let code: string | undefined;

    const payload = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
    let details: unknown = payload?.detail ?? payload?.details;

    if (payload) {
      const detailVal = payload.detail;
      if (typeof detailVal === 'string') {
        message = detailVal;
      } else if (Array.isArray(detailVal)) {
        message = detailVal
          .map((d: unknown) => {
            if (typeof d === 'string') return d;
            if (d && typeof d === 'object' && 'msg' in d && typeof d.msg === 'string') return d.msg;
            return JSON.stringify(d);
          })
          .join(', ');
      } else if (detailVal && typeof detailVal === 'object') {
        const dObj = detailVal as Record<string, unknown>;
        message = typeof dObj.message === 'string' ? dObj.message : JSON.stringify(detailVal);
        if (typeof dObj.code === 'string') code = dObj.code;
      }

      if (payload.error) {
        if (typeof payload.error === 'string') {
          message = payload.error;
        } else if (typeof payload.error === 'object') {
          const errObj = payload.error as Record<string, unknown>;
          message = typeof errObj.message === 'string' ? errObj.message : JSON.stringify(payload.error);
          if (typeof errObj.code === 'string') code = errObj.code;
          if (errObj.details !== undefined) details = errObj.details;
        }
      } else if (typeof payload.message === 'string') {
        message = payload.message;
      }

      if (!code && payload.code !== undefined) {
        code = String(payload.code);
      }
    }

    return new ApiError({
      status,
      code,
      message,
      details,
      requestId,
    });
  }
}
