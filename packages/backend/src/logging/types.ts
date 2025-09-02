export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogContext {
  [key: string]: any;
}