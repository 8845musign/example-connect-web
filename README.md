# Connect-Web Streaming Demo

React Router v7（Framework Mode）とconnect-webのストリーミング機能を学習するためのリアルタイムモニタリングダッシュボードです。

## 技術スタック

- **フロントエンド**: React 18, React Router v7, connect-web, TypeScript
- **バックエンド**: Node.js, @connectrpc/connect-node, Express, Protocol Buffers

## セットアップ

```bash
# 依存関係のインストール
npm run install:all

# Protocol Buffersのコード生成
npm run proto:generate

# 開発サーバーの起動
npm run dev
```

## プロジェクト構造

```
.
├── backend/         # Node.jsバックエンド
├── frontend/        # Reactフロントエンド
├── proto/          # Protocol Buffers定義
└── docs/           # ドキュメント
```

## 機能

- Server Streaming RPC（メトリクスデータのリアルタイム配信）
- Bidirectional Streaming RPC（インタラクティブクエリ）
- Unary RPC（メトリクスサマリーの取得）