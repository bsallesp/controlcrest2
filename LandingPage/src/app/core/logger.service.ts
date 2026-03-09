import { Inject, Injectable, Optional } from '@angular/core';
import { environment } from '../../environments/environment';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const MAX_BUFFER_SIZE = 200;

export const LOG_CONTEXT = 'LoggerContext';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private readonly buffer: LogEntry[] = [];
  private readonly minLevel: LogLevel = environment.production ? 'warn' : 'debug';

  constructor(@Optional() @Inject(LOG_CONTEXT) private defaultContext: string | null = null) {
    if (typeof window !== 'undefined') {
      (window as unknown as { __appLogs?: LogEntry[] }).__appLogs = this.buffer;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[this.minLevel];
  }

  private push(entry: LogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }
  }

  private emit(level: LogLevel, context: string, message: string, data?: unknown): void {
    const ctx = context || this.defaultContext || 'App';
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: ctx,
      message,
      ...(data !== undefined && { data })
    };
    this.push(entry);
    if (!this.shouldLog(level)) return;
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${ctx}] ${message}`;
    if (data !== undefined) {
      const payload = data instanceof Error ? { message: data.message, stack: data.stack } : data;
      switch (level) {
        case 'debug':
          console.debug(prefix, payload);
          break;
        case 'info':
          console.info(prefix, payload);
          break;
        case 'warn':
          console.warn(prefix, payload);
          break;
        case 'error':
          console.error(prefix, payload);
          break;
      }
    } else {
      switch (level) {
        case 'debug':
          console.debug(prefix);
          break;
        case 'info':
          console.info(prefix);
          break;
        case 'warn':
          console.warn(prefix);
          break;
        case 'error':
          console.error(prefix);
          break;
      }
    }
  }

  /** Log with explicit context: (context, message, data?) or with injected context: (message, data?) */
  debug(contextOrMessage: string, messageOrData?: string | unknown, data?: unknown): void {
    const [ctx, msg, d] = this.resolveArgs(contextOrMessage, messageOrData, data);
    this.emit('debug', ctx, msg, d);
  }

  info(contextOrMessage: string, messageOrData?: string | unknown, data?: unknown): void {
    const [ctx, msg, d] = this.resolveArgs(contextOrMessage, messageOrData, data);
    this.emit('info', ctx, msg, d);
  }

  warn(contextOrMessage: string, messageOrData?: string | unknown, data?: unknown): void {
    const [ctx, msg, d] = this.resolveArgs(contextOrMessage, messageOrData, data);
    this.emit('warn', ctx, msg, d);
  }

  error(contextOrMessage: string, messageOrData?: string | unknown, data?: unknown): void {
    const [ctx, msg, d] = this.resolveArgs(contextOrMessage, messageOrData, data);
    this.emit('error', ctx, msg, d);
  }

  private resolveArgs(
    contextOrMessage: string,
    messageOrData?: string | unknown,
    data?: unknown
  ): [context: string, message: string, data?: unknown] {
    const ctx = this.defaultContext;
    if (typeof messageOrData === 'string') {
      return [ctx || contextOrMessage, messageOrData, data];
    }
    return [ctx || contextOrMessage, contextOrMessage, messageOrData];
  }

  getBuffer(): readonly LogEntry[] {
    return this.buffer;
  }
}
