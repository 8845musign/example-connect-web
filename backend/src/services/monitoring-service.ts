// Removed unused imports
import type {
  GetMetricSummaryRequest,
  GetMetricSummaryResponse,
  StreamMetricsRequest,
  StreamLogsRequest,
  QueryRequest,
  QueryResponse,
} from '../proto/gen/monitoring/v1/service_pb.js';
import {
  GetMetricSummaryResponseSchema,
  QueryResponseSchema,
  StatusUpdateSchema,
} from '../proto/gen/monitoring/v1/service_pb.js';
import type { MetricData } from '../proto/gen/monitoring/v1/metrics_pb.js';
import type { LogEntry } from '../proto/gen/monitoring/v1/logs_pb.js';
// Removed unused type import
import { MetricSummarySchema } from '../proto/gen/monitoring/v1/metrics_pb.js';
// Removed unused schema imports
import { create } from '@bufbuild/protobuf';
import { timestampNow } from '@bufbuild/protobuf/wkt';
import { MetricsGenerator } from '../utils/metrics-generator.js';
import { LogsGenerator } from '../utils/logs-generator.js';

export class MonitoringServiceImpl {
  private metricsGenerator = new MetricsGenerator();
  private logsGenerator = new LogsGenerator();

  async getMetricSummary(req: GetMetricSummaryRequest): Promise<GetMetricSummaryResponse> {
    // モックデータを生成
    const summary = create(MetricSummarySchema, {
      metricType: req.metricType,
      min: Math.random() * 10,
      max: 90 + Math.random() * 10,
      avg: 45 + Math.random() * 10,
      count: BigInt(Math.floor(1000 + Math.random() * 1000)),
      startTime: req.startTime || timestampNow(),
      endTime: req.endTime || timestampNow(),
    });

    return create(GetMetricSummaryResponseSchema, {
      summary,
    });
  }

  async *streamMetrics(req: StreamMetricsRequest, context: any): AsyncGenerator<MetricData> {
    const intervalMs = req.intervalMs || 1000;
    const metricTypes =
      req.metricTypes.length > 0 ? req.metricTypes : ['cpu_usage', 'memory_usage', 'network_io'];

    console.log(`Starting metrics stream for types: ${metricTypes.join(', ')}`);

    while (!context.signal.aborted) {
      for (const metricType of metricTypes) {
        const metric = this.metricsGenerator.generateMetric(metricType);

        // ラベルフィルターの適用
        if (req.labelFilters && Object.keys(req.labelFilters).length > 0) {
          const matches = Object.entries(req.labelFilters).every(
            ([key, value]) => metric.labels[key] === value,
          );
          if (!matches) continue;
        }

        yield metric;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  async *streamLogs(req: StreamLogsRequest, context: any): AsyncGenerator<LogEntry> {
    console.log('Starting logs stream');

    // 過去のログを送信（tail = falseの場合）
    if (!req.tail) {
      const historicalLogs = this.logsGenerator.generateHistoricalLogs(50);
      for (const log of historicalLogs) {
        if (this.matchesLogFilter(log, req.filter)) {
          yield log;
        }
      }
    }

    // リアルタイムログのストリーミング
    while (!context.signal.aborted) {
      const log = this.logsGenerator.generateLog();

      if (this.matchesLogFilter(log, req.filter)) {
        yield log;
      }

      // ランダムな間隔でログを生成（100ms〜2000ms）
      await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 1900));
    }
  }

  async *interactiveQuery(
    stream: AsyncIterable<QueryRequest>,
    context: any,
  ): AsyncGenerator<QueryResponse> {
    let metricTypes = ['cpu_usage', 'memory_usage'];
    let labelFilters: Record<string, string> = {};
    let paused = false;
    let logFilter: any = null;

    console.log('Starting interactive query stream');

    // ステータス更新を送信
    yield create(QueryResponseSchema, {
      response: {
        case: 'statusUpdate',
        value: create(StatusUpdateSchema, {
          message: 'Interactive query stream started',
          timestamp: timestampNow(),
        }),
      },
    });

    // 並行処理のためのフラグとコントロール
    const requestQueue: QueryRequest[] = [];
    let streamEnded = false;

    // リクエスト処理用の非同期タスク
    const processRequests = async () => {
      try {
        for await (const request of stream) {
          requestQueue.push(request);
        }
      } finally {
        streamEnded = true;
      }
    };

    // リクエスト処理を開始（非同期）
    processRequests();

    // データ生成とリクエスト処理のメインループ
    while (!context.signal.aborted && !streamEnded) {
      // キューからリクエストを処理
      while (requestQueue.length > 0) {
        const request = requestQueue.shift()!;

        if (request.query.case === 'updateMetricsFilter' && request.query.value) {
          metricTypes = request.query.value.metricTypes;
          labelFilters = request.query.value.labelFilters || {};

          yield create(QueryResponseSchema, {
            response: {
              case: 'statusUpdate',
              value: create(StatusUpdateSchema, {
                message: `Metrics filter updated: ${metricTypes.join(', ')}`,
                timestamp: timestampNow(),
              }),
            },
          });
        } else if (request.query.case === 'updateLogsFilter' && request.query.value) {
          logFilter = request.query.value.filter;

          yield create(QueryResponseSchema, {
            response: {
              case: 'statusUpdate',
              value: create(StatusUpdateSchema, {
                message: 'Logs filter updated',
                timestamp: timestampNow(),
              }),
            },
          });
        } else if (request.query.case === 'pauseResume' && request.query.value) {
          paused = request.query.value.paused;

          yield create(QueryResponseSchema, {
            response: {
              case: 'statusUpdate',
              value: create(StatusUpdateSchema, {
                message: paused ? 'Stream paused' : 'Stream resumed',
                timestamp: timestampNow(),
              }),
            },
          });
        }
      }

      // データ生成
      if (!paused) {
        // メトリクスデータの生成
        for (const metricType of metricTypes) {
          const metric = this.metricsGenerator.generateMetric(metricType);

          const matches = Object.entries(labelFilters).every(
            ([key, value]) => metric.labels[key] === value,
          );

          if (matches) {
            yield create(QueryResponseSchema, {
              response: {
                case: 'metricData',
                value: metric,
              },
            });
          }
        }

        // ログデータの生成（ランダムに）
        if (Math.random() < 0.3) {
          const log = this.logsGenerator.generateLog();
          if (!logFilter || this.matchesLogFilter(log, logFilter)) {
            yield create(QueryResponseSchema, {
              response: {
                case: 'logEntry',
                value: log,
              },
            });
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  private matchesLogFilter(log: LogEntry, filter: any): boolean {
    if (!filter) return true;

    // レベルフィルター
    if (filter.levels && filter.levels.length > 0) {
      if (!filter.levels.includes(log.level)) return false;
    }

    // ソースフィルター
    if (filter.sources && filter.sources.length > 0) {
      if (!filter.sources.includes(log.source)) return false;
    }

    // テキスト検索
    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      if (!log.message.toLowerCase().includes(searchLower)) return false;
    }

    return true;
  }
}
