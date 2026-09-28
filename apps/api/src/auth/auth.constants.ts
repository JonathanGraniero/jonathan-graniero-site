export const AUTH_COOKIE = 'access_token';

export interface JwtPayload {
  sub: string;
  email: string;
}
