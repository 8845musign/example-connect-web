# ConnectRPC定義拡張ガイド

作成日: 2025-01-29

## 概要

このドキュメントでは、ConnectRPCの定義を拡張して新しい機能を追加する際の手順と実装パターンについて説明します。本プロジェクトの実装を基に、実践的なアプローチを提供します。

## 目次

1. [ConnectRPCアーキテクチャの理解](#connectrpcアーキテクチャの理解)
2. [新機能追加の基本手順](#新機能追加の基本手順)
3. [実装パターン別ガイド](#実装パターン別ガイド)
4. [具体的な実装例](#具体的な実装例)
5. [ベストプラクティス](#ベストプラクティス)
6. [トラブルシューティング](#トラブルシューティング)

## ConnectRPCアーキテクチャの理解

### プロジェクト構造

```
connect-web/
├── proto/                 # Protocol Buffer定義
│   └── monitoring/v1/    # サービス定義
├── backend/              
│   ├── src/
│   │   ├── services/     # gRPCサービス実装
│   │   └── proto/gen/    # 生成されたコード
├── frontend/
│   └── app/
│       └── lib/
│           └── proto/    # 生成されたクライアントコード
```

### 通信パターン

ConnectRPCは以下の4つの通信パターンをサポート：

1. **Unary RPC**: 単一リクエスト/レスポンス
2. **Server Streaming**: サーバーからクライアントへの一方向ストリーミング
3. **Client Streaming**: クライアントからサーバーへの一方向ストリーミング
4. **Bidirectional Streaming**: 双方向ストリーミング

## 新機能追加の基本手順

### 1. Proto定義の作成・修正

新しい機能を追加する際は、まずProto定義から始めます。

```protobuf
// proto/monitoring/v1/new_feature.proto
syntax = "proto3";

package monitoring.v1;

import "google/protobuf/timestamp.proto";

// 新しいメッセージ定義
message NewFeatureRequest {
  string id = 1;
  map<string, string> parameters = 2;
}

message NewFeatureResponse {
  string result = 1;
  google.protobuf.Timestamp processed_at = 2;
}
```

### 2. サービス定義の拡張

既存のサービスに新しいRPCメソッドを追加：

```protobuf
// proto/monitoring/v1/service.proto
service MonitoringService {
  // 既存のメソッド...
  
  // 新しいメソッドの追加
  rpc ProcessNewFeature(NewFeatureRequest) returns (NewFeatureResponse);
  
  // ストリーミングの例
  rpc StreamNewFeature(StreamNewFeatureRequest) returns (stream NewFeatureData);
}
```

### 3. コード生成

Proto定義を変更したら、必ずコードを再生成：

```bash
npm run proto:generate
```

これにより以下が生成されます：
- `backend/src/proto/gen/`: バックエンド用のTypeScript定義
- `frontend/app/lib/proto/`: フロントエンド用のTypeScript定義

### 4. バックエンド実装

サービス実装クラスに新しいメソッドを追加：

```typescript
// backend/src/services/monitoring-service.ts
export class MonitoringServiceImpl {
  // 新しいUnaryメソッド
  async processNewFeature(req: NewFeatureRequest): Promise<NewFeatureResponse> {
    // ビジネスロジックの実装
    const result = await this.processLogic(req);
    
    return create(NewFeatureResponseSchema, {
      result: result,
      processedAt: timestampNow(),
    });
  }
  
  // 新しいStreamingメソッド
  async *streamNewFeature(
    req: StreamNewFeatureRequest,
    context: any
  ): AsyncGenerator<NewFeatureData> {
    while (!context.signal.aborted) {
      // データ生成ロジック
      yield this.generateNewFeatureData();
      
      // インターバル制御
      await new Promise(resolve => setTimeout(resolve, req.intervalMs));
    }
  }
}
```

### 5. フロントエンド実装

#### カスタムフックの作成

```typescript
// frontend/app/lib/hooks/useNewFeature.ts
import { useEffect, useState, useRef } from 'react';
import { monitoringClient } from '../client';
import type { NewFeatureData } from '../proto/monitoring/v1/new_feature_pb';

export function useNewFeatureStream(parameters: StreamParameters) {
  const [data, setData] = useState<NewFeatureData[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // 前回の接続をキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    async function startStream() {
      try {
        setLoading(true);
        setError(null);

        const stream = monitoringClient.streamNewFeature(
          parameters,
          { signal: abortController.signal }
        );

        setLoading(false);

        for await (const item of stream) {
          if (abortController.signal.aborted) break;
          
          setData(prev => [...prev, item].slice(-100)); // 最新100件を保持
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
  }, [parameters]);

  return { data, error, loading };
}
```

#### UIコンポーネントの作成

```typescript
// frontend/app/routes/new-feature.tsx
import { useNewFeatureStream } from '~/lib/hooks/useNewFeature';

export default function NewFeature() {
  const { data, error, loading } = useNewFeatureStream({
    intervalMs: 1000,
    filters: { /* ... */ }
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data.map(item => (
        <div key={item.id}>
          {/* データ表示 */}
        </div>
      ))}
    </div>
  );
}
```

## 実装パターン別ガイド

### パターン1: 新しいデータタイプの追加

既存のストリーミングに新しいメトリクスタイプを追加する場合：

1. **Enum拡張**
```protobuf
enum MetricType {
  // 既存の値...
  METRIC_TYPE_NEW_METRIC = 8;  // 新しいメトリクスタイプ
}
```

2. **ジェネレーター拡張**
```typescript
// backend/src/utils/metrics-generator.ts
generateMetric(type: string): MetricData {
  switch(type) {
    case 'new_metric':
      return this.generateNewMetric();
    // 既存のケース...
  }
}
```

### パターン2: 新しいフィルタリング機能

双方向ストリーミングに新しいフィルタタイプを追加：

1. **Proto定義**
```protobuf
message QueryRequest {
  oneof query {
    // 既存のフィルタ...
    NewFilterType new_filter = 4;
  }
}

message NewFilterType {
  repeated string conditions = 1;
  bool include_historical = 2;
}
```

2. **サービス実装**
```typescript
// リクエスト処理内で新しいフィルタを処理
if (request.query.case === 'newFilter' && request.query.value) {
  this.applyNewFilter(request.query.value);
  // ステータス更新を送信
}
```

### パターン3: 新しいRPCエンドポイント

完全に新しい機能を追加する場合：

1. **独立したProtoファイル作成**
```protobuf
// proto/monitoring/v1/analytics.proto
syntax = "proto3";

package monitoring.v1;

service AnalyticsService {
  rpc GetAnalytics(GetAnalyticsRequest) returns (GetAnalyticsResponse);
  rpc StreamAnalytics(StreamAnalyticsRequest) returns (stream AnalyticsData);
}
```

2. **新しいサービスクラス作成**
```typescript
// backend/src/services/analytics-service.ts
export class AnalyticsServiceImpl {
  // 実装
}
```

3. **サーバーへの登録**
```typescript
// backend/src/server.ts
const analyticsService = new AnalyticsServiceImpl();
routes(router, analyticsService);
```

## 具体的な実装例

### 例1: アラート機能の追加

リアルタイムアラート機能を追加する実装例：

#### 1. Proto定義
```protobuf
// proto/monitoring/v1/alerts.proto
message Alert {
  string id = 1;
  AlertLevel level = 1;
  string message = 2;
  google.protobuf.Timestamp triggered_at = 3;
  map<string, string> metadata = 4;
}

enum AlertLevel {
  ALERT_LEVEL_UNSPECIFIED = 0;
  ALERT_LEVEL_INFO = 1;
  ALERT_LEVEL_WARNING = 2;
  ALERT_LEVEL_CRITICAL = 3;
}

message AlertCondition {
  string metric_type = 1;
  double threshold = 2;
  ComparisonOperator operator = 3;
}

enum ComparisonOperator {
  COMPARISON_OPERATOR_UNSPECIFIED = 0;
  COMPARISON_OPERATOR_GREATER_THAN = 1;
  COMPARISON_OPERATOR_LESS_THAN = 2;
  COMPARISON_OPERATOR_EQUALS = 3;
}
```

#### 2. サービス拡張
```protobuf
service MonitoringService {
  // 既存のメソッド...
  
  // アラート設定
  rpc SetAlertConditions(SetAlertConditionsRequest) returns (SetAlertConditionsResponse);
  
  // アラートストリーミング
  rpc StreamAlerts(StreamAlertsRequest) returns (stream Alert);
}
```

#### 3. バックエンド実装
```typescript
export class MonitoringServiceImpl {
  private alertConditions: AlertCondition[] = [];
  
  async setAlertConditions(req: SetAlertConditionsRequest): Promise<SetAlertConditionsResponse> {
    this.alertConditions = req.conditions;
    return create(SetAlertConditionsResponseSchema, {
      success: true,
      message: `${req.conditions.length} conditions set`
    });
  }
  
  async *streamAlerts(req: StreamAlertsRequest, context: any): AsyncGenerator<Alert> {
    while (!context.signal.aborted) {
      // メトリクスを監視してアラートをチェック
      const alerts = await this.checkAlertConditions();
      
      for (const alert of alerts) {
        yield alert;
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒ごとにチェック
    }
  }
  
  private async checkAlertConditions(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    for (const condition of this.alertConditions) {
      const currentValue = await this.getCurrentMetricValue(condition.metricType);
      
      if (this.evaluateCondition(currentValue, condition)) {
        alerts.push(create(AlertSchema, {
          id: crypto.randomUUID(),
          level: this.determineAlertLevel(currentValue, condition),
          message: `${condition.metricType} is ${currentValue} (threshold: ${condition.threshold})`,
          triggeredAt: timestampNow(),
          metadata: {
            metric_type: condition.metricType,
            current_value: currentValue.toString(),
            threshold: condition.threshold.toString()
          }
        }));
      }
    }
    
    return alerts;
  }
}
```

#### 4. フロントエンド実装
```typescript
// frontend/app/lib/hooks/useAlerts.ts
export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [conditions, setConditions] = useState<AlertCondition[]>([]);
  
  const updateConditions = useCallback(async (newConditions: AlertCondition[]) => {
    try {
      const response = await monitoringClient.setAlertConditions({
        conditions: newConditions
      });
      
      if (response.success) {
        setConditions(newConditions);
      }
    } catch (error) {
      console.error('Failed to update alert conditions:', error);
    }
  }, []);
  
  useEffect(() => {
    const abortController = new AbortController();
    
    async function startAlertStream() {
      try {
        const stream = monitoringClient.streamAlerts(
          {},
          { signal: abortController.signal }
        );
        
        for await (const alert of stream) {
          if (abortController.signal.aborted) break;
          
          setAlerts(prev => [...prev, alert].slice(-50)); // 最新50件を保持
          
          // 重要なアラートは通知
          if (alert.level === AlertLevel.CRITICAL) {
            showNotification(alert);
          }
        }
      } catch (err) {
        console.error('Alert stream error:', err);
      }
    }
    
    startAlertStream();
    
    return () => {
      abortController.abort();
    };
  }, []);
  
  return { alerts, conditions, updateConditions };
}
```

### 例2: データエクスポート機能

メトリクスデータをCSVやJSONでエクスポートする機能：

#### 1. Proto定義
```protobuf
message ExportDataRequest {
  repeated string metric_types = 1;
  google.protobuf.Timestamp start_time = 2;
  google.protobuf.Timestamp end_time = 3;
  ExportFormat format = 4;
}

enum ExportFormat {
  EXPORT_FORMAT_UNSPECIFIED = 0;
  EXPORT_FORMAT_CSV = 1;
  EXPORT_FORMAT_JSON = 2;
  EXPORT_FORMAT_EXCEL = 3;
}

message ExportDataResponse {
  bytes data = 1;
  string content_type = 2;
  string filename = 3;
}
```

#### 2. 実装
```typescript
async exportData(req: ExportDataRequest): Promise<ExportDataResponse> {
  const data = await this.fetchHistoricalData(
    req.metricTypes,
    req.startTime,
    req.endTime
  );
  
  let exportedData: Uint8Array;
  let contentType: string;
  let extension: string;
  
  switch (req.format) {
    case ExportFormat.CSV:
      exportedData = this.exportToCSV(data);
      contentType = 'text/csv';
      extension = 'csv';
      break;
    case ExportFormat.JSON:
      exportedData = this.exportToJSON(data);
      contentType = 'application/json';
      extension = 'json';
      break;
    default:
      throw new Error('Unsupported export format');
  }
  
  return create(ExportDataResponseSchema, {
    data: exportedData,
    contentType,
    filename: `metrics-export-${Date.now()}.${extension}`
  });
}
```

## ベストプラクティス

### 1. Proto定義の設計原則

- **前方互換性の維持**: 既存フィールドの番号は変更しない
- **予約フィールドの活用**: 将来の拡張のために番号を予約
- **適切な型の選択**: 数値の範囲や精度を考慮
- **明確な命名規則**: snake_caseでわかりやすい名前を使用

```protobuf
message ExtensibleMessage {
  string id = 1;
  string name = 2;
  // 3-9は将来の基本フィールド用に予約
  reserved 3 to 9;
  
  // 拡張データ用
  map<string, string> metadata = 10;
  google.protobuf.Any extension_data = 11;
}
```

### 2. エラーハンドリング

```typescript
// バックエンド
async *streamData(req: Request, context: any): AsyncGenerator<Data> {
  try {
    // ストリーミング処理
  } catch (error) {
    // ConnectError を throw
    throw new ConnectError(
      'Stream processing failed',
      Code.Internal,
      { cause: error }
    );
  }
}

// フロントエンド
try {
  const stream = client.streamData(request);
  for await (const data of stream) {
    // 処理
  }
} catch (error) {
  if (error instanceof ConnectError) {
    switch (error.code) {
      case Code.Canceled:
        // キャンセル処理
        break;
      case Code.DeadlineExceeded:
        // タイムアウト処理
        break;
      default:
        // その他のエラー
    }
  }
}
```

### 3. パフォーマンス最適化

- **バッチ処理**: 複数のデータをまとめて送信
- **圧縮**: 大量データの場合は圧縮を検討
- **キャッシング**: 頻繁にアクセスされるデータはキャッシュ
- **ページネーション**: 大量データの場合はページング実装

```typescript
// ページネーション例
message PageInfo {
  int32 page_size = 1;
  string page_token = 2;
}

message ListResponse {
  repeated Item items = 1;
  string next_page_token = 2;
  int32 total_count = 3;
}
```

### 4. テスト戦略

```typescript
// サービステスト例
describe('MonitoringService', () => {
  let service: MonitoringServiceImpl;
  
  beforeEach(() => {
    service = new MonitoringServiceImpl();
  });
  
  it('should stream metrics', async () => {
    const request = create(StreamMetricsRequestSchema, {
      metricTypes: ['cpu_usage'],
      intervalMs: 100
    });
    
    const context = {
      signal: new AbortController().signal
    };
    
    const results: MetricData[] = [];
    const stream = service.streamMetrics(request, context);
    
    // 3つのデータを収集してテスト
    for await (const metric of stream) {
      results.push(metric);
      if (results.length >= 3) break;
    }
    
    expect(results).toHaveLength(3);
    expect(results[0].metricType).toBe('cpu_usage');
  });
});
```

## トラブルシューティング

### 1. コード生成の問題

**問題**: `npm run proto:generate` が失敗する

**解決策**:
```bash
# buf.yamlの検証
buf lint proto/

# 依存関係の再インストール
rm -rf node_modules
npm run install:all

# 手動でbufを実行
npx buf generate proto/
```

### 2. ストリーミング接続の問題

**問題**: ストリームが予期せず切断される

**解決策**:
- タイムアウト設定の確認
- ネットワークプロキシの設定確認
- Keep-Aliveの実装

```typescript
// Keep-Alive実装例
async *streamWithKeepAlive(req: Request, context: any): AsyncGenerator<Response> {
  const keepAliveInterval = setInterval(() => {
    // Keep-Aliveメッセージを送信
    yield create(ResponseSchema, {
      response: {
        case: 'keepAlive',
        value: { timestamp: timestampNow() }
      }
    });
  }, 30000); // 30秒ごと
  
  try {
    // 通常のストリーミング処理
  } finally {
    clearInterval(keepAliveInterval);
  }
}
```

### 3. 型の不一致エラー

**問題**: TypeScriptの型エラーが発生

**解決策**:
- 生成されたコードが最新か確認
- import pathの確認
- `create()` 関数とSchemaの使用

```typescript
// 正しい使用例
import { create } from '@bufbuild/protobuf';
import { MetricDataSchema } from '../proto/gen/monitoring/v1/metrics_pb.js';

const metric = create(MetricDataSchema, {
  id: 'metric-1',
  metricType: 'cpu_usage',
  value: 75.5,
  timestamp: timestampNow()
});
```

## まとめ

ConnectRPCの定義を拡張する際は、以下の手順に従うことで、安全かつ効率的に新機能を追加できます：

1. **計画的な設計**: Proto定義から始め、前方互換性を考慮
2. **段階的な実装**: Proto → バックエンド → フロントエンドの順で実装
3. **適切なパターンの選択**: ユースケースに応じた通信パターンを選択
4. **エラーハンドリング**: 適切なエラー処理とリトライ戦略
5. **テストの実装**: 単体テストと統合テストの両方を実装

本ガイドの実装例とベストプラクティスを参考に、プロジェクトの要件に合わせてカスタマイズしてください。