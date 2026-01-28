import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { showErrorToast } from "./errorHandler";

/**
 * Wraps axios instance to automatically show error toasts
 * Use this for direct axios calls (not apiClient)
 * 
 * Note: apiClient already has error handling built-in via interceptors
 * 
 * @param axiosInstance - The axios instance to wrap
 * @returns Wrapped axios instance with automatic error toast handling
 */
export const createAxiosWithErrorHandling = (
  axiosInstance: AxiosInstance
): AxiosInstance => {
  // Create a proxy that wraps all axios methods
  const wrappedAxios = axiosInstance;

  // Wrap common methods
  const wrapMethod = <T extends (...args: any[]) => Promise<AxiosResponse>>(
    method: T
  ): T => {
    return ((...args: any[]) => {
      return method.apply(wrappedAxios, args).catch((error) => {
        // Show error toast unless explicitly skipped
        const config = args[args.length - 1] as AxiosRequestConfig | undefined;
        if (!config?.skipErrorToast) {
          showErrorToast(error);
        }
        throw error;
      });
    }) as T;
  };

  // Return wrapped instance
  return {
    ...wrappedAxios,
    get: wrapMethod(wrappedAxios.get.bind(wrappedAxios)),
    post: wrapMethod(wrappedAxios.post.bind(wrappedAxios)),
    put: wrapMethod(wrappedAxios.put.bind(wrappedAxios)),
    patch: wrapMethod(wrappedAxios.patch.bind(wrappedAxios)),
    delete: wrapMethod(wrappedAxios.delete.bind(wrappedAxios)),
    request: wrapMethod(wrappedAxios.request.bind(wrappedAxios)),
  } as AxiosInstance;
};

/**
 * Helper function to wrap axios calls with error handling
 * Use this for one-off axios calls that don't use apiClient
 * 
 * @param axiosCall - Function that returns an axios promise
 * @param options - Optional configuration
 * @param options.skipErrorToast - If true, skip showing error toast
 * @returns The axios response
 * 
 * @example
 * ```ts
 * const response = await axiosWithErrorHandling(() =>
 *   axios.post('/api/endpoint', data)
 * );
 * ```
 */
export const axiosWithErrorHandling = async <T = any>(
  axiosCall: () => Promise<AxiosResponse<T>>,
  options?: { skipErrorToast?: boolean }
): Promise<AxiosResponse<T>> => {
  try {
    return await axiosCall();
  } catch (error) {
    if (!options?.skipErrorToast) {
      showErrorToast(error);
    }
    throw error;
  }
};

