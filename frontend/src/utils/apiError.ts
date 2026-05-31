export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Converts an unknown catch error (typically from axios) to a typed ApiError.
 */
export function toApiError(err: unknown): ApiError {
  if (err !== null && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as {
      response?: {
        status?: number;
        data?: {
          error?: { message?: string; code?: string; errors?: unknown[] };
          message?: string;
        };
      };
    };
    const errorData = axiosErr.response?.data?.error;
    return {
      message: errorData?.message ?? axiosErr.response?.data?.message ?? 'Error desconocido',
      code: errorData?.code,
      status: axiosErr.response?.status,
      errors: Array.isArray(errorData?.errors)
        ? (errorData.errors as ApiError['errors'])
        : undefined,
    };
  }
  if (err instanceof Error) {
    return { message: err.message };
  }
  return { message: 'Error desconocido' };
}
