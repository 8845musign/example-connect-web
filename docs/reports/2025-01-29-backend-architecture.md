# Backend アーキテクチャ調査報告書

## 概要

本報告書では、connect-web プロジェクトのバックエンド設計について調査した結果をまとめます。このバックエンドは、gRPC-Web 通信パターンを実装したリアルタイムストリーミングダッシュボードのサーバー側コンポーネントです。

## 技術スタック

### 主要技術
- **ランタイム**: Node.js (ES Modules)
- **フレームワーク**: Express.js
- **通信プロトコル**: gRPC-Web via @connectrpc/connect-node v2
- **データ形式**: Protocol Buffers (protobuf)
- **開発ツール**: TypeScript, tsx (hot reload)

### 依存関係
```json
{
  "@bufbuild/protobuf": "^2.2.0",
  "@connectrpc/connect": "^2.0.0",
  "@connectrpc/connect-node": "^2.0.0",
  "@connectrpc/connect-express": "^2.0.0",
  "express": "^4.18.2",
  "cors": "^2.8.5"
}
```

## アーキテクチャ構成

### ディレクトリ構造
```
backend/
├── src/
│   ├── index.ts              # エントリーポイント・サーバー起動
│   ├── services/
│   │   └── monitoring-service.ts  # gRPCサービス実装
│   ├── utils/
│   │   ├── metrics-generator.ts   # メトリクスデータ生成
│   │   └── logs-generator.ts      # ログデータ生成
│   └── proto/
│       └── gen/              # 生成されたProtobufコード
```

### サーバー構成 (index.ts)

エントリーポイントでは以下の設定を行っています：

1. **Express サーバーの初期化**
   - ポート: 8080 (環境変数 PORT で変更可能)

2. **CORS 設定**
   - オリジン: http://localhost:3000
   - 認証情報: 有効

3. **Connect-RPC ミドルウェア**
   - MonitoringService の登録
   - エンドポイント: `/monitoring.v1.MonitoringService`

## gRPC サービス実装

### MonitoringService の機能

#### 1. Unary RPC: GetMetricSummary
- **目的**: 特定期間のメトリクスサマリーを取得
- **実装**: モックデータを生成して返却
- **レスポンス**: 最小値、最大値、平均値、カウント数

#### 2. Server Streaming RPC: StreamMetrics
- **目的**: リアルタイムメトリクスのストリーミング配信
- **特徴**:
  - 複数のメトリクスタイプを指定可能
  - カスタマイズ可能な配信間隔
  - ラベルによるフィルタリング機能
  - 非同期ジェネレータによる実装
- **配信メトリクス**:
  - CPU使用率
  - メモリ使用率
  - ディスクI/O
  - ネットワークI/O
  - リクエストレート
  - エラーレート
  - レイテンシ

#### 3. Server Streaming RPC: StreamLogs
- **目的**: ログエントリのリアルタイムストリーミング
- **機能**:
  - 過去ログの配信（tail=false時）
  - リアルタイムログの継続配信
  - ログレベル、ソース、テキストによるフィルタリング
- **ログレベル**: DEBUG, INFO, WARN, ERROR, FATAL

#### 4. Bidirectional Streaming RPC: InteractiveQuery
- **目的**: クライアントからの動的なクエリに応じたデータ配信
- **特徴**:
  - 双方向ストリーミング通信
  - リアルタイムフィルター更新
  - 一時停止/再開機能
  - メトリクスとログの同時配信
- **処理フロー**:
  1. クライアントからのリクエストを非同期で受信
  2. フィルター条件の更新処理
  3. 条件に応じたデータの生成と送信

## データ生成ロジック

### MetricsGenerator
- **実装パターン**: 各メトリクスタイプごとに異なる生成ロジック
- **特徴**:
  - CPU使用率: 正弦波ベースの変動
  - メモリ使用率: 緩やかな増加とGCによる減少
  - ディスク/ネットワークI/O: バースト的な変動
  - エラーレート: 低基準値での偶発的スパイク

### LogsGenerator
- **ログテンプレート**: レベルごとに定義された現実的なメッセージ
- **メタデータ**: 環境、バージョン、トレースID等を付与
- **動的生成**: テンプレートに動的な値を埋め込み

## Protocol Buffers 定義

### サービス定義 (service.proto)
```protobuf
service MonitoringService {
  rpc GetMetricSummary(GetMetricSummaryRequest) returns (GetMetricSummaryResponse);
  rpc StreamMetrics(StreamMetricsRequest) returns (stream MetricData);
  rpc StreamLogs(StreamLogsRequest) returns (stream LogEntry);
  rpc InteractiveQuery(stream QueryRequest) returns (stream QueryResponse);
}
```

### データ構造
- **MetricData**: ID、タイプ、値、タイムスタンプ、ラベル、単位
- **LogEntry**: ID、レベル、メッセージ、タイムスタンプ、ソース、メタデータ

## 開発・運用

### 開発コマンド
```bash
npm run dev        # tsx watchによるホットリロード開発
npm run build      # TypeScriptコンパイル
npm run start      # 本番環境実行
npm run lint       # ESLint実行
npm run format     # Prettier実行
```

### ビルドプロセス
1. `npm run proto:generate` - Protocol Buffersコードの生成
2. `npm run build` - TypeScriptのコンパイル
3. 出力先: `dist/` ディレクトリ

## 設計上の特徴

### 1. ストリーミング実装
- AsyncGeneratorを使用した効率的なストリーミング
- AbortSignalによる適切なリソース管理
- コンテキストベースのキャンセレーション

### 2. スケーラビリティ
- ステートレスなサービス設計
- 個別のジェネレータクラスによるデータ生成の分離
- メモリ効率的なストリーミング処理

### 3. 柔軟性
- フィルタリング機能による動的なデータ配信
- 設定可能な配信間隔
- 双方向通信による対話的な操作

### 4. 開発効率
- TypeScriptによる型安全性
- Protocol Buffersによる明確なAPI定義
- ホットリロードによる高速な開発サイクル

## セキュリティと運用面

### CORS設定
- フロントエンド (localhost:3000) からのアクセスのみ許可
- 認証情報の送信を許可

### エラーハンドリング
- ストリーミング中の接続断による適切なリソース解放
- クライアントのAbortSignalに対する反応

## まとめ

このバックエンドは、gRPC-Webを使用したモダンなリアルタイムストリーミングシステムの実装例として設計されています。Connect-RPCフレームワークを活用することで、型安全性を保ちながら効率的な双方向通信を実現しています。モックデータ生成による実装は、実際の監視システムのプロトタイプや学習用途に適した設計となっています。