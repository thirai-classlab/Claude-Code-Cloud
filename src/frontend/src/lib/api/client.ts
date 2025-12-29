/**
 * Base API Client for Claude Code Web
 * Provides HTTP request utilities with error handling
 */

export interface ApiError {
  message: string;
  status: number;
  data?: any;
}

// Helper to get auth token from localStorage (Zustand persist)
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed?.state?.accessToken || null;
    }
  } catch {
    return null;
  }
  return null;
}

// Helper to clear auth state and redirect to login
function handleUnauthorized() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('auth-storage');
  } catch {
    // Ignore storage errors
  }
  // Redirect to login page
  if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
    window.location.href = '/login';
  }
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if token exists
    const token = getAuthToken();
    if (token) {
      (defaultHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        // Handle 401 Unauthorized - redirect to login
        if (response.status === 401) {
          handleUnauthorized();
        }

        const errorData = await response.json().catch(() => ({}));
        // Handle FastAPI validation errors (422)
        let message: string;
        if (Array.isArray(errorData.detail)) {
          // Pydantic validation errors
          message = errorData.detail
            .map((err: { msg: string; loc: (string | number)[] }) =>
              `${err.loc.join('.')}: ${err.msg}`
            )
            .join(', ');
        } else if (typeof errorData.detail === 'string') {
          message = errorData.detail;
        } else {
          message = `HTTP ${response.status}: ${response.statusText}`;
        }
        const error: ApiError = {
          message,
          status: response.status,
          data: errorData,
        };
        throw error;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      if ((error as ApiError).status) {
        throw error;
      }
      // Network error
      throw {
        message: 'Network error. Please check your connection.',
        status: 0,
        data: error,
      } as ApiError;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
