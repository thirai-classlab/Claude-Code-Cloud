/**
 * Authentication API Client
 * Handles user authentication operations
 */

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name?: string;
}

export interface User {
  id: string;
  email: string;
  display_name?: string;
  is_active: boolean;
  is_verified: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class AuthApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  /**
   * Register a new user
   */
  async register(email: string, password: string, displayName?: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        display_name: displayName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(this.parseError(errorData, response.status));
    }

    return response.json();
  }

  /**
   * Login with email and password
   * Uses OAuth2 password flow (form-urlencoded)
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(this.parseError(errorData, response.status));
    }

    return response.json();
  }

  /**
   * Logout current user
   */
  async logout(token: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok && response.status !== 401) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(this.parseError(errorData, response.status));
    }
  }

  /**
   * Get current user info
   */
  async getMe(token: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(this.parseError(errorData, response.status));
    }

    return response.json();
  }

  /**
   * Parse error response
   */
  private parseError(errorData: any, status: number): string {
    if (Array.isArray(errorData.detail)) {
      // Pydantic validation errors
      return errorData.detail
        .map((err: { msg: string; loc: (string | number)[] }) =>
          `${err.loc.join('.')}: ${err.msg}`
        )
        .join(', ');
    } else if (typeof errorData.detail === 'string') {
      return errorData.detail;
    } else if (status === 401) {
      return 'Invalid email or password';
    } else if (status === 409) {
      return 'This email is already registered';
    }
    return `Request failed with status ${status}`;
  }
}

export const authApi = new AuthApi();
