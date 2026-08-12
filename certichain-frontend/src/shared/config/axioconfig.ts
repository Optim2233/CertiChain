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
    return this.request<T>({
      method: 'POST',
      url: endpoint,
      headers,
      data: formData,
    });
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
