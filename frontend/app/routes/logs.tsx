import { useState, useEffect, useRef } from "react";
import { Link } from "@remix-run/react";
import { monitoringClient } from "~/lib/client";
import type { LogEntry, LogLevel } from "~/lib/proto/monitoring/v1/logs_pb";
import { timestampDate } from "@bufbuild/protobuf/wkt";

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState({
    levels: [] as LogLevel[],
    searchText: '',
    tail: true,
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const startStreaming = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setIsStreaming(true);
      setError(null);

      const stream = monitoringClient.streamLogs(
        {
          filter: {
            levels: filter.levels,
            searchText: filter.searchText,
          },
          tail: filter.tail,
        },
        { signal: abortController.signal }
      );

      for await (const log of stream) {
        if (abortController.signal.aborted) break;
        
        setLogs(prev => {
          const updated = [...prev, log];
          // 最新500件のみ保持
          return updated.slice(-500);
        });
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        setError(err as Error);
        console.error('Log streaming error:', err);
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
  };

  // 自動スクロール
  useEffect(() => {
    if (filter.tail && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, filter.tail]);

  const logLevelColors = {
    [1]: '#6c757d', // DEBUG - gray
    [2]: '#28a745', // INFO - green
    [3]: '#ffc107', // WARN - yellow
    [4]: '#dc3545', // ERROR - red
    [5]: '#721c24', // FATAL - dark red
  };

  const logLevelNames = {
    [1]: 'DEBUG',
    [2]: 'INFO',
    [3]: 'WARN',
    [4]: 'ERROR',
    [5]: 'FATAL',
  };

  return (
    <div className="logs-page">
      <header>
        <h1>ログビューア</h1>
        <Link to="/" className="back-link">← ダッシュボードに戻る</Link>
      </header>

      <div className="logs-controls">
        <div className="control-group">
          <label>
            ログレベル:
            <select 
              multiple 
              value={filter.levels.map(String)}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => Number(option.value));
                setFilter(prev => ({ ...prev, levels: selected }));
              }}
            >
              <option value="1">DEBUG</option>
              <option value="2">INFO</option>
              <option value="3">WARN</option>
              <option value="4">ERROR</option>
              <option value="5">FATAL</option>
            </select>
          </label>
        </div>

        <div className="control-group">
          <label>
            検索:
            <input
              type="text"
              value={filter.searchText}
              onChange={(e) => setFilter(prev => ({ ...prev, searchText: e.target.value }))}
              placeholder="ログメッセージを検索..."
            />
          </label>
        </div>

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={filter.tail}
              onChange={(e) => setFilter(prev => ({ ...prev, tail: e.target.checked }))}
            />
            自動スクロール
          </label>
        </div>

        <div className="control-group">
          {!isStreaming ? (
            <button onClick={startStreaming} className="btn-start">
              ストリーミング開始
            </button>
          ) : (
            <button onClick={stopStreaming} className="btn-stop">
              ストリーミング停止
            </button>
          )}
        </div>

        {error && (
          <div className="error-message">
            エラー: {error.message}
          </div>
        )}
      </div>

      <div className="logs-container">
        {logs.length === 0 ? (
          <div className="no-logs">
            {isStreaming ? 'ログを待機中...' : 'ストリーミングを開始してください'}
          </div>
        ) : (
          <div className="logs-list">
            {logs.map((log) => (
              <div key={log.id} className="log-entry" data-level={log.level}>
                <span 
                  className="log-level" 
                  style={{ color: logLevelColors[log.level as keyof typeof logLevelColors] }}
                >
                  [{logLevelNames[log.level as keyof typeof logLevelNames]}]
                </span>
                <span className="log-timestamp">
                  {log.timestamp ? timestampDate(log.timestamp).toLocaleString('ja-JP') : ''}
                </span>
                <span className="log-source">[{log.source}]</span>
                <span className="log-message">{log.message}</span>
                {log.traceId && (
                  <span className="log-trace">trace:{log.traceId}</span>
                )}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}