# 実装ガイド

## React Router v7 (Framework Mode) の実装方針

### 1. ルーティング構成

```typescript
// app/routes/_index.tsx - ダッシュボードトップ
// app/routes/metrics.tsx - メトリクスレイアウト
// app/routes/metrics.$type.tsx - 各メトリクス詳細
// app/routes/logs.tsx - ログビューア
// app/routes/settings.tsx - 設定画面
```

### 2. データローディング戦略

React Router v7の特徴を活かした実装：

```typescript
// ルートローダーでの初期データ取得
export const loader = async ({ params }: LoaderFunctionArgs) => {
  // メトリクスサマリーの取得（Unary RPC）
  const summary = await monitoringClient.getMetricSummary({
    metricType: params.type,
    startTime: getStartTime(),
    endTime: new Date()
  });
  
  return { summary };
};

// コンポーネントでのストリーミング接続
export default function MetricDetail() {
  const { summary } = useLoaderData<typeof loader>();
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  
  useEffect(() => {
    // ストリーミング接続の確立
    const stream = monitoringClient.streamMetrics({
      metricTypes: [params.type],
      intervalMs: 1000
    });
    
    // データ受信ハンドラー
    stream.subscribe({
      next: (metric) => {
        setMetrics(prev => [...prev.slice(-100), metric]);
      },
      error: (err) => {
        console.error('Stream error:', err);
      }
    });
    
    return () => stream.cancel();
  }, [params.type]);
}
```

### 3. エラーバウンダリー

```typescript
// app/routes/metrics.tsx
export function ErrorBoundary() {
  const error = useRouteError();
  
  if (isRouteErrorResponse(error)) {
    return <div>接続エラー: {error.status}</div>;
  }
  
  return <div>予期しないエラーが発生しました</div>;
}
```

## connect-web ストリーミング実装方針

### 1. クライアント設定

```typescript
// app/lib/client.ts
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { MonitoringService } from "./proto/monitoring/v1/service_connect";

const transport = createConnectTransport({
  baseUrl: "http://localhost:8080",
  // ストリーミング用の設定
  interceptors: [],
});

export const monitoringClient = createClient(MonitoringService, transport);
```

### 2. Server Streaming の実装

```typescript
// app/hooks/useMetricsStream.ts
export function useMetricsStream(metricTypes: string[]) {
  const [data, setData] = useState<MetricData[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();
    
    async function startStream() {
      try {
        const stream = monitoringClient.streamMetrics(
          {
            metricTypes,
            intervalMs: 1000,
          },
          { signal: abortController.signal }
        );

        setLoading(false);

        for await (const metric of stream) {
          setData(prev => {
            const updated = [...prev, metric];
            // 最新100件のみ保持（メモリ管理）
            return updated.slice(-100);
          });
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(err as Error);
        }
      }
    }

    startStream();

    return () => {
      abortController.abort();
    };
  }, [metricTypes]);

  return { data, error, loading };
}
```

### 3. Bidirectional Streaming の実装

```typescript
// app/hooks/useInteractiveQuery.ts
export function useInteractiveQuery() {
  const [data, setData] = useState<QueryResponse[]>([]);
  const streamRef = useRef<WritableStream<QueryRequest> | null>(null);

  const connect = useCallback(async () => {
    const stream = await monitoringClient.interactiveQuery();
    streamRef.current = stream.requests;

    // レスポンス処理
    (async () => {
      for await (const response of stream.responses) {
        setData(prev => [...prev, response]);
      }
    })();
  }, []);

  const updateFilter = useCallback(async (filter: UpdateMetricsFilter) => {
    if (streamRef.current) {
      await streamRef.current.write({
        query: {
          case: "updateMetricsFilter",
          value: filter
        }
      });
    }
  }, []);

  const pauseResume = useCallback(async (paused: boolean) => {
    if (streamRef.current) {
      await streamRef.current.write({
        query: {
          case: "pauseResume",
          value: { paused }
        }
      });
    }
  }, []);

  return { connect, updateFilter, pauseResume, data };
}
```

## UI実装方針

### 1. リアルタイムチャート

```typescript
// app/components/MetricsChart.tsx
import { memo } from 'react';

export const MetricsChart = memo(({ data }: { data: MetricData[] }) => {
  // Chart.jsやRechartsを使用した実装
  // メモ化により不要な再レンダリングを防止
});
```

### 2. ログビューア

```typescript
// app/components/LogViewer.tsx
export function LogViewer() {
  const { logs } = useLogsStream();
  
  return (
    <VirtualizedList
      items={logs}
      renderItem={(log) => <LogEntry log={log} />}
      // 仮想スクロールで大量ログを効率的に表示
    />
  );
}
```

### 3. フィルターコントロール

```typescript
// app/components/FilterControls.tsx
export function FilterControls({ onFilterChange }) {
  // デバウンスを使用して過度なフィルター更新を防止
  const debouncedChange = useDebouncedCallback(onFilterChange, 300);
  
  return (
    <div>
      {/* フィルターUI */}
    </div>
  );
}
```

## エラーハンドリングとリトライ

### 1. 自動リトライ機構

```typescript
// app/lib/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError!;
}
```

### 2. 接続状態の管理

```typescript
// app/hooks/useConnectionStatus.ts
export function useConnectionStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  
  // 接続状態の監視とUIへのフィードバック
  return { status, retry: () => {} };
}
```