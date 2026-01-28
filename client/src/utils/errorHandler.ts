import { AxiosError } from "axios";
import { addToast } from "../redux/slices/toasterSlice";
import store from "../redux/store";

/**
 * Backend error response format:
 * { success: false, reason: string, ...props }
 */
interface BackendErrorResponse {
  success: false;
  reason?: string;
  errorMessage?: string;
  message?: string;
  [key: string]: any;
}

/**
 * Extracts error message from various error formats
 * 
 * Handles:
 * - Backend consistent format: { success: false, reason: "..." }
 * - Axios errors with response data
 * - Network errors
 * - Standard Error objects
 * - String errors
 * 
 * @param error - The error to extract message from
 * @returns A user-friendly error message
 */
export const extractErrorMessage = (error: unknown): string => {
  // Axios error with backend response
  if (error instanceof AxiosError) {
    const response = error.response?.data as BackendErrorResponse | undefined;
    
    if (response) {
      // Backend consistent format: { success: false, reason: "..." }
      if (response.reason) {
        return response.reason;
      }
      
      // Alternative: errorMessage field
      if (response.errorMessage) {
        return response.errorMessage;
      }
      
      // Alternative: message field
      if (response.message) {
        return response.message;
      }
    }
    
    // Network error or no response
    if (error.code === "ERR_NETWORK" || !error.response) {
      return "Network error. Please check your connection.";
    }
    
    // HTTP status code based messages
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 400:
          return "Bad request. Please check your input.";
        case 401:
          return "Unauthorized. Please login again.";
        case 403:
          return "Forbidden. You don't have permission to perform this action.";
        case 404:
          return "Resource not found.";
        case 409:
          return "Conflict. This resource already exists.";
        case 500:
          return "Internal server error. Please try again later.";
        default:
          return `Error ${status}: ${error.message}`;
      }
    }
    
    return error.message || "An unexpected error occurred.";
  }
  
  // Standard Error object
  if (error instanceof Error) {
    return error.message;
  }
  
  // String error
  if (typeof error === "string") {
    return error;
  }
  
  // Fallback
  return "An unexpected error occurred.";
};

/**
 * Shows error toast notification
 * 
 * Automatically extracts error message and displays it in a toast.
 * Used by apiClient interceptor and can be called manually.
 * 
 * @param error - The error to display
 * @param customMessage - Optional custom message to override extracted message
 * 
 * @example
 * ```ts
 * try {
 *   await someApiCall();
 * } catch (error) {
 *   showErrorToast(error);
 * }
 * ```
 */
export const showErrorToast = (error: unknown, customMessage?: string): void => {
  const message = customMessage || extractErrorMessage(error);
  
  store.dispatch(
    addToast({
      message,
      type: "error",
      duration: 5000,
    })
  );
};

/**
 * Shows success toast notification
 * 
 * @param message - Success message to display
 * @param duration - Toast duration in milliseconds (default: 3000)
 * 
 * @example
 * ```ts
 * showSuccessToast("User created successfully");
 * ```
 */
export const showSuccessToast = (message: string, duration: number = 3000): void => {
  store.dispatch(
    addToast({
      message,
      type: "success",
      duration,
    })
  );
};

/**
 * Shows warning toast notification
 * 
 * @param message - Warning message to display
 * @param duration - Toast duration in milliseconds (default: 4000)
 */
export const showWarningToast = (message: string, duration: number = 4000): void => {
  store.dispatch(
    addToast({
      message,
      type: "warning",
      duration,
    })
  );
};

/**
 * Shows info toast notification
 * 
 * @param message - Info message to display
 * @param duration - Toast duration in milliseconds (default: 3000)
 */
export const showInfoToast = (message: string, duration: number = 3000): void => {
  store.dispatch(
    addToast({
      message,
      type: "info",
      duration,
    })
  );
};
