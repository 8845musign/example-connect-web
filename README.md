# connect-web Streaming Dashboard

[connect-web](https://connectrpc.com/docs/web) v2と[React Router v7](https://reactrouter.com/)を使用したリアルタイムストリーミングダッシュボードのデモアプリケーションです。

このプロジェクトは、gRPC-Webのストリーミングパターン（Server Streaming、Bidirectional Streaming、Unary RPC）を実装し、モダンなWebアプリケーションでのリアルタイムデータ通信の実践例を示しています。

## 🚀 主な機能

- **リアルタイムメトリクス監視**: CPU、メモリ、ネットワークI/O、ディスクI/Oなどのシステムメトリクスをリアルタイムで可視化
- **ログストリーミング**: アプリケーションログのリアルタイム表示とフィルタリング
- **双方向通信**: インタラクティブなクエリによる動的なデータフィルタリング
- **型安全な通信**: Protocol Buffersによる厳密な型定義
- **モダンなアーキテクチャ**: React Router v7のファイルベースルーティングとconnect-web v2の最新API

## 📋 前提条件

- Node.js 18.x以上
- npm 8.x以上

## 🛠️ セットアップ

### 1. 依存関係のインストール

```bash
# ルートディレクトリで実行
npm install

# または各ディレクトリで個別に実行
cd backend && npm install
cd ../frontend && npm install
```

### 2. Protocol Buffersのコード生成

```bash
# ルートディレクトリで実行
npm run generate
```

### 3. アプリケーションの起動

```bash
# 開発サーバーを起動（バックエンドとフロントエンドを同時に起動）
npm run dev

# または個別に起動
# バックエンド（ポート8080）
cd backend && npm run dev

# フロントエンド（ポート3000）
cd frontend && npm run dev
```

### 4. アプリケーションへのアクセス

ブラウザで http://localhost:3000 を開きます。

## 🏗️ プロジェクト構造

```
connect-web/
├── backend/                 # Node.js バックエンド
│   ├── src/
│   │   ├── index.ts        # Express + connect-nodeサーバー
│   │   ├── services/       # gRPCサービス実装
│   │   └── utils/          # データジェネレーター
│   └── package.json
├── frontend/               # React フロントエンド
│   ├── app/
│   │   ├── routes/        # React Router v7のファイルベースルート
│   │   ├── components/    # Reactコンポーネント
│   │   └── lib/           # connect-webクライアントとhooks
│   └── package.json
├── proto/                  # Protocol Buffers定義
│   └── monitoring/v1/
│       ├── metrics.proto
│       ├── logs.proto
│       └── service.proto
├── docs/                   # プロジェクトドキュメント
└── buf.gen.yaml           # buf設定ファイル
```

## 🔧 技術スタック

### バックエンド

- **Node.js** + **TypeScript**
- **Express** - HTTPサーバー
- **@connectrpc/connect-node** v2 - gRPCサーバー実装
- **@bufbuild/protobuf** v2 - Protocol Buffersランタイム

### フロントエンド

- **React** 18
- **React Router** v7 - ファイルベースルーティング
- **@connectrpc/connect-web** v2 - gRPC-Webクライアント
- **Vite** - ビルドツール

### 共通

- **Protocol Buffers** - インターフェース定義
- **buf** - Protocol Buffersツールチェーン

## 📚 ドキュメント

詳細なドキュメントは[docs](./docs)ディレクトリを参照してください：

- [技術的決定事項](./docs/technical-decisions.md) - アーキテクチャの選択理由
- [アーキテクチャ](./docs/architecture.md) - システム設計の詳細
- [実装ガイド](./docs/implementation-guide.md) - 実装の詳細
- [学習目標](./docs/learning-objectives.md) - このプロジェクトから学べること

## 🎯 使用方法

### メトリクス監視

1. ダッシュボードから「メトリクスモニター」を選択
2. 監視したいメトリクスタイプ（CPU、メモリなど）を選択
3. リアルタイムでグラフが更新されます
4. 更新間隔の調整が可能

### ログビューア

1. ダッシュボードから「ログビューア」を選択
2. ログレベルでフィルタリング可能
3. テキスト検索機能
4. 自動スクロール機能

### インタラクティブクエリ

1. ダッシュボードから「インタラクティブクエリ」を選択
2. 双方向ストリーミングで接続
3. メトリクスタイプを動的に変更
4. ストリームの一時停止/再開が可能

## 🔍 主要なコード例

### gRPCサービスの実装（バックエンド）

```typescript
// Server Streaming RPCの例
async *streamMetrics(req: StreamMetricsRequest): AsyncGenerator<MetricData> {
  while (!context.signal.aborted) {
    yield this.metricsGenerator.generateMetric(req.metricType);
    await new Promise(resolve => setTimeout(resolve, req.intervalMs));
  }
}
```

### connect-webクライアントの使用（フロントエンド）

```typescript
// ストリーミングRPCの呼び出し
const stream = monitoringClient.streamMetrics({
  metricTypes: ['cpu_usage'],
  intervalMs: 1000,
});

for await (const metric of stream) {
  console.log('Received metric:', metric);
}
```

## 🐛 トラブルシューティング

### buf: command not found

```bash
npm install -g @bufbuild/buf
```

### ポートが既に使用されている

```bash
# 使用中のプロセスを確認
lsof -i :3000  # フロントエンド
lsof -i :8080  # バックエンド
```

### Protocol Buffersの再生成が必要

```bash
npm run generate
```

## 📝 ライセンス

MIT

## 🤝 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを作成して変更内容を説明してください。
