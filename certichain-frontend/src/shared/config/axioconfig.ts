import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import type { ApiError, ApiResponse } from '@/shared/types/types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';


const instance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

function toApiError(error: AxiosError): ApiError {
  const data = error.response?.data as { message?: string } | undefined;
  return {
    message: data?.message || error.message || 'Request failed',
    status: error.response?.status || 0,
  };
}

export class ApiClient {
  private async request<T>(
    config: AxiosRequestConfig,
    data?: unknown
  ): Promise<ApiResponse<T>> {
    try {
      const response = await instance.request<T>({
        ...config,
        data,
      });
      return {
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        throw toApiError(error);
      }
      throw error;
    }
  }

  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'GET', url: endpoint, headers });
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'POST', url: endpoint, headers }, data);
  }

  async postMultipart<T>(
    endpoint: string,
    formData: FormData,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    // Deliberately bypasses axios here: the instance's default
    // 'Content-Type: application/json' header survives axios's browser
    // adapter even when overridden with `undefined`, so it never lets the
    // browser attach its own multipart boundary - every multipart endpoint
    // (institution apply, batch issuance) 403s. Native fetch has no such
    // default and sets the boundary correctly for a FormData body.
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => undefined) as { message?: string } | undefined;
      throw { message: data?.message || response.statusText, status: response.status } satisfies ApiError;
    }
    const data = (await response.json().catch(() => undefined)) as T;
    return { data, status: response.status };
  }

  async getBlob(endpoint: string, headers?: Record<string, string>): Promise<{ blob: Blob; fileName: string | null }> {
    // Native fetch, not axios: a plain <a href> to this endpoint hands the URL straight to
    // the OS/browser's download pipeline, which download-manager tools (IDM etc.) intercept
    // outright. Fetching the bytes in JS and saving via a Blob URL never exposes a navigable
    // URL for them to grab.
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      credentials: 'include',
      headers,
    });
    if (!response.ok) {
      throw { message: response.statusText, status: response.status } satisfies ApiError;
    }
    const disposition = response.headers.get('Content-Disposition');
    const fileName = disposition?.match(/filename="?([^"]+)"?/)?.[1] ?? null;
    return { blob: await response.blob(), fileName };
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PUT', url: endpoint, headers }, data);
  }

  async patch<T>(
    endpoint: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PATCH', url: endpoint, headers }, data);
  }

  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'DELETE', url: endpoint, headers });
  }
}

export const apiClient = new ApiClient();
