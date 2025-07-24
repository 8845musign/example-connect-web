import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router';
import { monitoringClient } from '~/lib/client';
import type { QueryRequest, QueryResponse } from '~/lib/proto/monitoring/v1/service_pb';
import {
  QueryRequestSchema,
  UpdateMetricsFilterSchema,
  PauseResumeSchema,
} from '~/lib/proto/monitoring/v1/service_pb';
import { create } from '@bufbuild/protobuf';
import { timestampDate } from '@bufbuild/protobuf/wkt';

export default function InteractivePage() {
  const [responses, setResponses] = useState<QueryResponse[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['cpu_usage', 'memory_usage']);
  const requestQueueRef = useRef<QueryRequest[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const connect = useCallback(async () => {
    try {
      // Create an abort controller for cancellation
      abortControllerRef.current = new AbortController();

      // Create an async generator for requests
      async function* requestGenerator(): AsyncGenerator<QueryRequest> {
        // Send initial filter
        yield create(QueryRequestSchema, {
          query: {
            case: 'updateMetricsFilter' as const,
            value: create(UpdateMetricsFilterSchema, {
              metricTypes: selectedMetrics,
              labelFilters: {},
            }),
          },
        });

        // Process queued requests
        while (!abortControllerRef.current?.signal.aborted) {
          if (requestQueueRef.current.length > 0) {
            const request = requestQueueRef.current.shift()!;
            yield request;
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      const responseStream = monitoringClient.interactiveQuery(requestGenerator(), {
        signal: abortControllerRef.current.signal,
      });

      setIsConnected(true);

      // レスポンス処理
      (async () => {
        try {
          for await (const response of responseStream) {
            setResponses((prev) => {
              const updated = [...prev, response];
              return updated.slice(-100); // 最新100件のみ保持
            });
          }
        } catch (err) {
          console.error('Stream error:', err);
          setIsConnected(false);
        }
      })();
    } catch (err) {
      console.error('Connection error:', err);
      setIsConnected(false);
    }
  }, [selectedMetrics]);

  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsConnected(false);
    setIsPaused(false);
  }, []);

  const updateMetricsFilter = useCallback(
    async (metrics: string[]) => {
      if (isConnected) {
        requestQueueRef.current.push(
          create(QueryRequestSchema, {
            query: {
              case: 'updateMetricsFilter' as const,
              value: create(UpdateMetricsFilterSchema, {
                metricTypes: metrics,
                labelFilters: {},
              }),
            },
          }),
        );
        setSelectedMetrics(metrics);
      }
    },
    [isConnected],
  );

  const togglePause = useCallback(async () => {
    if (isConnected) {
      const newPaused = !isPaused;
      requestQueueRef.current.push(
        create(QueryRequestSchema, {
          query: {
            case: 'pauseResume' as const,
            value: create(PauseResumeSchema, {
              paused: newPaused,
            }),
          },
        }),
      );
      setIsPaused(newPaused);
    }
  }, [isConnected, isPaused]);

  const renderResponse = (response: QueryResponse, index: number) => {
    if (response.response.case === 'statusUpdate' && response.response.value) {
      return (
        <div key={index} className="response-item status-update">
          <span className="timestamp">
            {response.response.value.timestamp
              ? timestampDate(response.response.value.timestamp).toLocaleTimeString('ja-JP')
              : ''}
          </span>
          <span className="message">{response.response.value.message}</span>
        </div>
      );
    }

    if (response.response.case === 'metricData' && response.response.value) {
      const metric = response.response.value;
      return (
        <div key={index} className="response-item metric-data">
          <span className="timestamp">
            {metric.timestamp ? timestampDate(metric.timestamp).toLocaleTimeString('ja-JP') : ''}
          </span>
          <span className="metric-type">[{metric.metricType}]</span>
          <span className="value">
            {metric.value.toFixed(2)} {metric.unit}
          </span>
          <span className="labels">
            {Object.entries(metric.labels)
              .map(([k, v]) => `${k}:${v}`)
              .join(', ')}
          </span>
        </div>
      );
    }

    if (response.response.case === 'logEntry' && response.response.value) {
      const log = response.response.value;
      return (
        <div key={index} className="response-item log-entry">
          <span className="timestamp">
            {log.timestamp ? timestampDate(log.timestamp).toLocaleTimeString('ja-JP') : ''}
          </span>
          <span className="log-level">[{log.level}]</span>
          <span className="source">[{log.source}]</span>
          <span className="message">{log.message}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="interactive-page">
      <header>
        <h1>インタラクティブクエリ</h1>
        <Link to="/" className="back-link">
          ← ダッシュボードに戻る
        </Link>
      </header>

      <div className="interactive-controls">
        <div className="connection-controls">
          {!isConnected ? (
            <button onClick={connect} className="btn-connect">
              接続
            </button>
          ) : (
            <>
              <button onClick={disconnect} className="btn-disconnect">
                切断
              </button>
              <button onClick={togglePause} className="btn-pause">
                {isPaused ? '再開' : '一時停止'}
              </button>
              <span className="status connected">接続済み</span>
            </>
          )}
        </div>

        <div className="filter-controls">
          <h3>メトリクスフィルター</h3>
          <div className="metrics-checkboxes">
            {[
              'cpu_usage',
              'memory_usage',
              'network_io',
              'disk_io',
              'request_rate',
              'error_rate',
              'latency',
            ].map((metric) => (
              <label key={metric}>
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(metric)}
                  onChange={(e) => {
                    const newMetrics = e.target.checked
                      ? [...selectedMetrics, metric]
                      : selectedMetrics.filter((m) => m !== metric);
                    updateMetricsFilter(newMetrics);
                  }}
                  disabled={!isConnected}
                />
                {metric}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="responses-container">
        <h3>ストリーミングレスポンス</h3>
        {responses.length === 0 ? (
          <div className="no-responses">
            {isConnected ? 'データを待機中...' : '接続してストリーミングを開始してください'}
          </div>
        ) : (
          <div className="responses-list">
            {responses.map((response, index) => renderResponse(response, index))}
          </div>
        )}
      </div>
    </div>
  );
}
