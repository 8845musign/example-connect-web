# 実装ガイド

最終更新日: 2025年1月21日
バージョン: v2対応版

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
    endTime: new Date(),
  });

  return { summary };
};

// コンポーネントでのストリーミング接続
export default function MetricDetail() {
  const { summary } = useLoaderData<typeof loader>();
  const [metrics, setMetrics] = useState<MetricData[]>([]);

  useEffect(() => {
    // ストリーミング接続の確立（v2 API）
    const stream = monitoringClient.streamMetrics({
      metricTypes: [params.type],
      intervalMs: 1000,
    });

    // async iteratorを使用したデータ受信
    (async () => {
      try {
        for await (const metric of stream) {
          setMetrics((prev) => [...prev.slice(-100), metric]);
        }
      } catch (err) {
        console.error('Stream error:', err);
      }
    })();

    // クリーンアップでストリームをキャンセル
    return () => {
      // AbortControllerを使用してキャンセル
    };
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
import { createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { MonitoringService } from './proto/monitoring/v1/service_pb'; // v2では_pb.tsを使用

const transport = createConnectTransport({
  baseUrl: 'http://localhost:8080',
  // v2でのストリーミング設定
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
          { signal: abortController.signal },
        );

        setLoading(false);

        for await (const metric of stream) {
          setData((prev) => {
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

v2ではBidirectional StreamingのAPIが変更されています：

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
        setData((prev) => [...prev, response]);
      }
    })();
  }, []);

  const updateFilter = useCallback(async (filter: UpdateMetricsFilter) => {
    if (streamRef.current) {
      await streamRef.current.write({
        query: {
          case: 'updateMetricsFilter',
          value: filter,
        },
      });
    }
  }, []);

  const pauseResume = useCallback(async (paused: boolean) => {
    if (streamRef.current) {
      await streamRef.current.write({
        query: {
          case: 'pauseResume',
          value: { paused },
        },
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
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
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

## v2 移行のポイント

### 1. Protocol Buffers コード生成の変更

**buf.gen.yaml の更新**：

```yaml
# v1
version: v1
plugins:
  - plugin: es
    out: backend/src/proto/gen
    opt:
      - target=ts
  - plugin: connect-es
    out: backend/src/proto/gen
    opt:
      - target=ts

# v2
version: v2
managed:
  enabled: true
plugins:
  - remote: buf.build/bufbuild/es:v2.2.0
    out: backend/src/proto/gen
    opt:
      - target=ts
      - import_extension=js
```

### 2. メッセージ作成のAPI変更

```typescript
// v1
import { MetricSummary } from './metrics_pb';
const summary = new MetricSummary();
summary.min = 10;

// v2
import { create } from '@bufbuild/protobuf';
import { MetricSummarySchema } from './metrics_pb';
const summary = create(MetricSummarySchema, {
  min: 10,
});
```

### 3. タイムスタンプの扱い

```typescript
// v1
import { Timestamp } from '@bufbuild/protobuf';
const ts = new Timestamp();
ts.toDate();

// v2
import { timestampNow, timestampDate, timestampFromDate } from '@bufbuild/protobuf/wkt';
const ts = timestampNow();
const date = timestampDate(ts);
const tsFromDate = timestampFromDate(new Date());
```

### 4. BigInt のシリアライゼーション

```typescript
// v2ではtoJsonを使用してBigIntを含むメッセージを安全にJSON化
import { toJson } from '@bufbuild/protobuf';
import { GetMetricSummaryResponseSchema } from './service_pb';

const jsonResponse = toJson(GetMetricSummaryResponseSchema, response);
return json({ summary: jsonResponse.summary });
```

### 5. ストリーミングAPIの変更

```typescript
// v2ではasync iteratorパターンが推奨
const stream = client.streamMetrics(request);

// for awaitを使用したシンプルな処理
for await (const response of stream) {
  handleResponse(response);
}
```

これらの変更により、よりモダンで効率的なコードが実現できます。
