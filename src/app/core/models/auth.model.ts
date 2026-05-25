export interface AuthResponse {
  token: string;
  staffId: string;
  name: string;
  role: string;
  expiresAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
