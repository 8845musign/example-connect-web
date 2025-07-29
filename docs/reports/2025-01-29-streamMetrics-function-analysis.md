# streamMetrics関数の詳細解説

## 概要

`streamMetrics`は、connect-webプロジェクトにおけるリアルタイムメトリクスストリーミング機能の中核となる関数です。この関数は、バックエンドのMonitoringServiceクラス内で実装され、gRPCのServer Streaming RPCパターンを使用してメトリクスデータをクライアントに継続的に配信します。

## 実装場所

- **ファイル**: `/backend/src/services/monitoring-service.ts`
- **行番号**: 46-81行目
- **クラス**: `MonitoringServiceImpl`

## 関数シグネチャ

```typescript
async *streamMetrics(req: StreamMetricsRequest, context: any): AsyncGenerator<MetricData>
```

### パラメータ

1. **req: StreamMetricsRequest**
   - `metricTypes`: 配信するメトリクスタイプの配列（例: 'cpu_usage', 'memory_usage'）
   - `intervalMs`: メトリクス配信間隔（ミリ秒単位、デフォルト: 1000ms）
   - `labelFilters`: メトリクスをフィルタリングするためのラベル条件（key-valueのマップ）

2. **context: any**
   - `signal`: AbortSignalオブジェクトを含むコンテキスト（ストリーミングの停止制御に使用）

### 戻り値

`AsyncGenerator<MetricData>`: 非同期ジェネレータとして、MetricDataオブジェクトを逐次的に返します。

## 実装詳細

### 1. 初期化処理（行46-51）

```typescript
const intervalMs = req.intervalMs || 1000;
const metricTypes = req.metricTypes.length > 0 ? req.metricTypes : ['cpu_usage', 'memory_usage', 'network_io'];
```

- リクエストから配信間隔を取得（デフォルト1秒）
- メトリクスタイプが指定されていない場合は、デフォルトの3種類を設定

### 2. メインループ（行53-80）

```typescript
while (!context.signal.aborted) {
  const startTime = Date.now();
  // メトリクス生成とフィルタリング処理
  // ...
}
```

- `context.signal.aborted`がtrueになるまで継続的にループ
- クライアントが切断またはキャンセルした場合に自動的に停止

### 3. メトリクス生成とフィルタリング（行56-68）

各メトリクスタイプに対して：
1. `MetricsGenerator.generateMetric()`でメトリクスデータを生成
2. ラベルフィルターが指定されている場合、条件に合致するメトリクスのみを配信
3. `yield`キーワードでメトリクスをストリームに送出

### 4. タイミング制御（行70-79）

```typescript
if (i < metricTypes.length - 1) {
  await new Promise((resolve) => setTimeout(resolve, intervalMs / metricTypes.length));
}
// ...
const remainingTime = Math.max(0, intervalMs - elapsedTime);
await new Promise((resolve) => setTimeout(resolve, remainingTime));
```

- 複数のメトリクスタイプを均等な間隔で配信
- 全体のサイクルを指定されたintervalMsに保つよう調整

## 依存関係

### 1. MetricsGenerator

- **ファイル**: `/backend/src/utils/metrics-generator.ts`
- **責務**: 各種メトリクスデータの生成
- **生成可能なメトリクス**:
  - cpu_usage: CPU使用率（波状に変動）
  - memory_usage: メモリ使用率（緩やかに増加、時々GCで減少）
  - disk_io: ディスクI/O（バースト的な活動）
  - network_io: ネットワークI/O（通常トラフィックとスパイク）
  - request_rate: リクエストレート（時間帯による変動）
  - error_rate: エラーレート（低い基準値で時々スパイク）
  - latency: レイテンシ（正規分布風）

### 2. Protocol Buffers定義

- **ファイル**: `/proto/monitoring/v1/service.proto`
- **関連メッセージ**:
  - `StreamMetricsRequest`: リクエスト構造
  - `MetricData`: レスポンスデータ構造

## クライアント側の使用方法

### フロントエンドフック

- **ファイル**: `/frontend/app/lib/hooks/useMetricsStream.ts`
- **機能**: Reactフックとしてメトリクスストリームを管理

```typescript
const { data, error, loading } = useMetricsStream(['cpu_usage', 'memory_usage'], 1000);
```

主な機能：
- 自動的な接続管理
- エラーハンドリング
- メモリ管理（最新100件のみ保持）
- コンポーネントのアンマウント時の自動切断

## 設計上の特徴

### 1. 非同期ジェネレータパターン

- `async *`構文を使用し、効率的なストリーミングを実現
- メモリ効率が良く、大量のデータを扱える

### 2. フィルタリング機能

- ラベルベースのフィルタリングにより、特定のホストやリージョンのメトリクスのみを取得可能
- サーバー側でフィルタリングすることで、ネットワーク帯域を節約

### 3. タイミング制御

- 指定された間隔を正確に保つアルゴリズム
- 複数メトリクスの均等配信により、データの偏りを防止

### 4. グレースフルシャットダウン

- AbortSignalを使用した適切な停止処理
- リソースリークを防ぐ設計

## ユースケース

1. **リアルタイムダッシュボード**: システムメトリクスの可視化
2. **アラート監視**: 特定条件でのメトリクス監視
3. **パフォーマンス分析**: 時系列データの収集と分析
4. **マルチテナント環境**: ラベルフィルターによる特定テナントのメトリクス取得

## まとめ

`streamMetrics`関数は、gRPCのServer Streaming RPCパターンを活用した効率的なリアルタイムデータ配信を実現しています。非同期ジェネレータ、フィルタリング機能、正確なタイミング制御により、スケーラブルで柔軟なメトリクス配信システムを構築しています。