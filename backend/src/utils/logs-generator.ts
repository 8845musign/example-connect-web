import type { LogEntry } from '../proto/gen/monitoring/v1/logs_pb.js';
import { LogEntrySchema, LogLevel } from '../proto/gen/monitoring/v1/logs_pb.js';
import { create } from '@bufbuild/protobuf';
import { timestampNow, timestampFromDate } from '@bufbuild/protobuf/wkt';

export class LogsGenerator {
  private logTemplates = {
    [LogLevel.DEBUG]: [
      'Database connection pool size: {value}',
      'Cache hit ratio: {value}%',
      'Request processing started for {endpoint}',
      'Memory allocation: {value} MB',
    ],
    [LogLevel.INFO]: [
      'Successfully processed request for {endpoint}',
      'User {userId} logged in from {ip}',
      'Scheduled job {jobName} completed in {duration}ms',
      'Health check passed',
      'Configuration reloaded',
    ],
    [LogLevel.WARN]: [
      'High memory usage detected: {value}%',
      'Slow query detected: {query} took {duration}ms',
      'Rate limit approaching for user {userId}',
      'Connection timeout to {service}',
      'Deprecated API endpoint {endpoint} called',
    ],
    [LogLevel.ERROR]: [
      'Failed to process request: {error}',
      'Database connection failed: {error}',
      'Authentication failed for user {userId}',
      'Service {service} unavailable',
      'Invalid request format: {error}',
    ],
    [LogLevel.FATAL]: [
      'Out of memory error',
      'Unable to connect to database',
      'Critical security violation detected',
      'System shutdown initiated',
    ],
  };

  private sources = ['api-server', 'auth-service', 'database', 'cache-layer', 'worker', 'scheduler'];
  private traceIdCounter = 0;

  generateLog(): LogEntry {
    const level = this.selectLogLevel();
    const source = this.sources[Math.floor(Math.random() * this.sources.length)];
    const templates = this.logTemplates[level];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    const message = this.fillTemplate(template);
    const traceId = Math.random() < 0.7 ? `trace-${++this.traceIdCounter}` : '';
    const spanId = traceId ? `span-${Math.random().toString(36).slice(2, 11)}` : '';

    const metadata: Record<string, string> = {
      environment: 'production',
      version: '1.2.3',
    };

    // レベルに応じて追加のメタデータ
    if (level >= LogLevel.WARN) {
      metadata.alertSent = 'true';
    }

    if (source === 'api-server') {
      metadata.statusCode = level === LogLevel.ERROR ? '500' : '200';
    }

    return create(LogEntrySchema, {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      level,
      message,
      timestamp: timestampNow(),
      source,
      metadata,
      traceId,
      spanId,
    });
  }

  generateHistoricalLogs(count: number): LogEntry[] {
    const logs: LogEntry[] = [];
    const now = Date.now();
    
    for (let i = 0; i < count; i++) {
      const log = this.generateLog();
      // 過去1時間のログを生成
      const pastTime = now - (3600000 - (i * 72000 / count));
      log.timestamp = timestampFromDate(new Date(pastTime));
      logs.push(log);
    }
    
    return logs;
  }

  private selectLogLevel(): LogLevel {
    const rand = Math.random();
    if (rand < 0.3) return LogLevel.DEBUG;
    if (rand < 0.6) return LogLevel.INFO;
    if (rand < 0.85) return LogLevel.WARN;
    if (rand < 0.98) return LogLevel.ERROR;
    return LogLevel.FATAL;
  }

  private fillTemplate(template: string): string {
    const replacements: Record<string, string> = {
      value: Math.floor(Math.random() * 100).toString(),
      endpoint: ['/api/users', '/api/products', '/api/orders', '/api/analytics'][
        Math.floor(Math.random() * 4)
      ],
      userId: `user-${Math.floor(Math.random() * 10000)}`,
      ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      jobName: ['data-sync', 'backup', 'cleanup', 'report-generation'][
        Math.floor(Math.random() * 4)
      ],
      duration: Math.floor(Math.random() * 5000).toString(),
      query: 'SELECT * FROM users WHERE last_login < ?',
      service: ['redis', 'postgres', 'elasticsearch', 'rabbitmq'][
        Math.floor(Math.random() * 4)
      ],
      error: [
        'Connection refused',
        'Timeout exceeded',
        'Invalid credentials',
        'Resource not found',
        'Permission denied',
      ][Math.floor(Math.random() * 5)],
    };

    return template.replace(/{(\w+)}/g, (match, key) => replacements[key] || match);
  }
}