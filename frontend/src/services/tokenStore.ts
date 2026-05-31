/**
 * In-memory store del access token JWT.
 *
 * El token vive solo en esta variable de módulo, nunca en localStorage ni
 * sessionStorage, de modo que un XSS no puede leerlo del almacenamiento del
 * navegador. Se repuebla en cada arranque mediante el refresh silencioso de
 * AuthContext (que usa la cookie HttpOnly `refresh_token`).
 */
let accessToken: string | null = null;

export const tokenStore = {
  get: (): string | null => accessToken,
  set: (token: string | null): void => {
    accessToken = token;
  },
  clear: (): void => {
    accessToken = null;
  },
};
