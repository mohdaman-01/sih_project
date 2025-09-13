/**
 * Shared code between client and server
 * API configuration and types for Railway backend integration
 */

// Heroku Backend URL - use environment variable or fallback
export const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 'https://nova-s-sih-35061497bf29.herokuapp.com';

/**
 * Backend API Response Types
 */
export interface HealthResponse {
  status: string;
  version: string;
  database: string;
  services: {
    ocr: string;
    verification: string;
    ai_module: string;
  };
}

export interface UploadResponse {
  id: string;
  filename: string;
  size: number;
  mime_type: string;
  upload_time: string;
  status: string;
}

export interface OCRResponse {
  id: string;
  extracted_text: string;
  confidence: number;
  processing_time: number;
  language: string;
}

export interface VerificationResponse {
  id: string;
  status: 'valid' | 'invalid' | 'suspect';
  confidence: number;
  matched_record?: {
    certificate_number: string;
    name: string;
    institution: string;
    course: string;
    year: number;
  };
  issues: string[];
  verification_time: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * API Client Functions
 */
export class APIClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Health Check
  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  // File Upload
  async uploadCertificate(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<UploadResponse>('/api/v1/upload/certificate', {
      method: 'POST',
      body: formData,
    });
  }

  // OCR Text Extraction
  async extractText(file: File): Promise<OCRResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<OCRResponse>('/api/v1/ocr/extract-text', {
      method: 'POST',
      body: formData,
    });
  }

  // Certificate Verification
  async verifyCertificate(certificateId: string): Promise<VerificationResponse> {
    return this.request<VerificationResponse>(`/api/v1/verify/certificate/${certificateId}`, {
      method: 'POST',
    });
  }

  // Google Authentication
  redirectToGoogleAuth(): void {
    const redirectUrl = `${this.baseURL}/api/v1/auth/google?redirect_uri=${encodeURIComponent(window.location.origin)}`;
    console.log("🚀 Redirecting to Google OAuth:", redirectUrl);
    window.location.href = redirectUrl;
  }

  // Check if OAuth is available
  async checkOAuthAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/auth/google`, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Set auth token
  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  // Clear auth token
  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }
}

// Export singleton instance
export const apiClient = new APIClient();
