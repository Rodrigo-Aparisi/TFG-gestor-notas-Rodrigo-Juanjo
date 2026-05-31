const isDev = process.env.NODE_ENV !== 'production';

export const clientLogger = {
  error: (message: string, ...args: unknown[]): void => {
    if (isDev) console.error(`[ERROR] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]): void => {
    if (isDev) console.warn(`[WARN] ${message}`, ...args);
  },
  info: (message: string, ...args: unknown[]): void => {
    if (isDev) console.info(`[INFO] ${message}`, ...args);
  },
};
