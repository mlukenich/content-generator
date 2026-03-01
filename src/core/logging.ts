export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogContext {
  requestId?: string;
  correlationId?: string;
  phase?: string;
  jobId?: string | number;
  niche?: string;
  durationMs?: number;
  errorType?: string;
  [key: string]: unknown;
}

function format(level: LogLevel, message: string, context: LogContext = {}): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  });
}

export function logInfo(message: string, context: LogContext = {}): void {
  console.log(format('INFO', message, context));
}

export function logWarn(message: string, context: LogContext = {}): void {
  console.warn(format('WARN', message, context));
}

export function logError(message: string, context: LogContext = {}): void {
  console.error(format('ERROR', message, context));
}
