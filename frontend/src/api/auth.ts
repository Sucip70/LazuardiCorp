import { apiFetch } from './client'

const TOKEN_KEY = 'lazuardi_auth_token'

export type User = {
  id: string
  email: string
  name: string
}

export type AuthResponse = {
  token: string
  user: User
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(getToken())
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }).then((resp) => {
    setToken(resp.token)
    return resp
  })
}

export function register(name: string, email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  }).then((resp) => {
    setToken(resp.token)
    return resp
  })
}

export function logout(): Promise<void> {
  const token = getToken()
  clearToken()
  if (!token) return Promise.resolve()
  return apiFetch<void>('/api/v1/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => undefined)
}

export function fetchMe(): Promise<User> {
  return apiFetch<User>('/api/v1/auth/me')
}
