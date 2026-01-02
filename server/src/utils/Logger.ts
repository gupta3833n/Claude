type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private context: string;
  private static logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  private static levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(context: string) {
    this.context = context;
  }

  private shouldLog(level: LogLevel): boolean {
    return Logger.levels[level] >= Logger.levels[Logger.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + args.map((a) => JSON.stringify(a)).join(' ') : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${formattedArgs}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, ...args));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, ...args));
    }
  }

  static setLogLevel(level: LogLevel): void {
    Logger.logLevel = level;
  }
}
