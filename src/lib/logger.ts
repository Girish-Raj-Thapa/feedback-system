/**
 * A lightweight structured logger for Next.js APIs.
 * This ensures errors are logged in a JSON format that is easily parsed by Vercel/Datadog/CloudWatch.
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

function emit(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: any,
) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  if (error) {
    payload['error_name'] = error.name;
    payload['error_message'] = error.message;
    payload['stack'] = error.stack;
  }

  // In production, always output as a single JSON string line for parsers
  if (process.env.NODE_ENV === 'production') {
    console[level](JSON.stringify(payload));
  } else {
    // In local development, pretty-print for readability
    console[level](
      `[${level.toUpperCase()}] ${message}`,
      context || '',
      error || '',
    );
  }
}

export const logger = {
  info: (message: string, context?: LogContext) =>
    emit('info', message, context),
  warn: (message: string, context?: LogContext, error?: any) =>
    emit('warn', message, context, error),
  error: (message: string, context?: LogContext, error?: any) =>
    emit('error', message, context, error),
};
