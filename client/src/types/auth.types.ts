export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  device_id: string;
}

export interface FileRef {
  _id?: string;
  display_name?: string;
  original_name?: string;
  storage_path?: string;
  url?: string;
  type?: string;
  content_type?: string;
  extension?: string;
  size_in_bytes?: number;
}

export interface User {
    _id: string;
    fullName: string;
    email: string;
    username?: string;
    role?: "Admin" | "Agent" | "Viewer";
    isEmailVerified: boolean;
    profile_picture?: FileRef | string | null;
  }

  export type OtpType = "password" | "email";
