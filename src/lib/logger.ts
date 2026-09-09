import { captureException } from '@/lib/sentry';

declare const __DEV__: boolean;

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';

type LogArgs = unknown[];

function prefixed(level: string, args: LogArgs): LogArgs {
  return [`[padelcito:${level}]`, ...args];
}

function redactForProduction(args: LogArgs): LogArgs {
  return args.map((arg) => {
    if (arg instanceof Error) {
      return arg.message;
    }
    if (typeof arg === 'string' && arg.length > 200) {
      return `${arg.slice(0, 200)}…`;
    }
    return arg;
  });
}

export const logger = {
  info: (...args: LogArgs): void => {
    if (isDev) {
      console.info(...prefixed('info', args));
    }
  },
  warn: (...args: LogArgs): void => {
    if (isDev) {
      console.warn(...prefixed('warn', args));
    }
  },
  error: (...args: LogArgs): void => {
    if (isDev) {
      console.error(...prefixed('error', args));
    } else {
      console.error(...prefixed('error', redactForProduction(args)));
    }

    const firstError = args.find((arg) => arg instanceof Error);
    if (firstError instanceof Error) {
      captureException(firstError);
    }
  },
};
