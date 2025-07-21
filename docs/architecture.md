# アーキテクチャ設計書

最終更新日: 2025年1月21日
バージョン: v2対応版

## 概要

このプロジェクトは、React Router v7（Framework Mode）とconnect-web v2のストリーミング機能を学習するためのリアルタイムモニタリングダッシュボードです。

## 技術スタック

### フロントエンド

- **React 18**: UIライブラリ
- **React Router v7 (Framework Mode)**: ルーティングフレームワーク
  - Server Componentは使用しない
  - Client-side onlyの構成
- **@connectrpc/connect-web v2**: gRPC-Webクライアント
  - ストリーミングRPCの実装
  - @bufbuild/protobuf v2との統合
- **TypeScript**: 型安全性の確保
- **Vite**: ビルドツール

### バックエンド

- **Node.js + TypeScript**: サーバーランタイム
- **@connectrpc/connect-node v2**: gRPCサーバー実装
- **Express**: HTTPサーバー
- **Protocol Buffers**: API定義
- **@bufbuild/protobuf v2**: Protocol Buffersランタイム

## アーキテクチャの特徴

### 1. ストリーミング通信

connect-web v2の3つのストリーミングパターンを実装：

1. **Server Streaming RPC**
   - メトリクスデータのリアルタイム配信
   - ログストリーミング
   - サーバーからクライアントへの一方向ストリーム

2. **Bidirectional Streaming RPC**
   - インタラクティブクエリ
   - 動的なフィルタリング
   - リアルタイムでのクエリ条件変更

3. **Unary RPC**
   - メトリクスサマリーの取得
   - 単発のリクエスト/レスポンス

### 2. データフロー

```
[データジェネレーター] → [gRPCサービス] → [ストリーム] → [connect-web] → [React UI]
                            ↑                                     ↓
                            └──── フィルター条件 ←─────────────────┘
```

### 3. 状態管理

- ストリーミングデータはReactの状態として管理
- useEffectでストリーム接続のライフサイクル管理
- エラーハンドリングとリトライ機構

## ディレクトリ構造

```
.
├── backend/                 # バックエンドサーバー
│   ├── src/
│   │   ├── services/       # gRPCサービス実装
│   │   ├── utils/          # データジェネレーター
│   │   └── proto/gen/      # 生成されたProtoBufコード
│   └── package.json
├── frontend/               # フロントエンドアプリ
│   ├── app/
│   │   ├── routes/        # React Routerのルート
│   │   ├── components/    # UIコンポーネント
│   │   └── lib/
│   │       ├── proto/     # 生成されたProtoBufコード
│   │       ├── hooks/     # カスタムフック
│   │       └── utils/     # ユーティリティ
│   └── package.json
├── proto/                  # Protocol Buffers定義
│   └── monitoring/v1/
│       ├── metrics.proto
│       ├── logs.proto
│       └── service.proto
└── docs/                   # ドキュメント
```

## セキュリティ考慮事項

1. **CORS設定**: フロントエンドからのアクセスのみ許可
2. **認証**: 本サンプルでは実装しないが、実運用では必須
3. **レート制限**: ストリーミング接続数の制限
4. **バックプレッシャー**: クライアントの処理能力に応じた制御

## パフォーマンス最適化

1. **データバッファリング**: 大量データの効率的な処理
2. **メモリ管理**: ストリーミングデータの適切な破棄
3. **接続管理**: 不要なストリームの切断
4. **レンダリング最適化**: React.memoやuseMemoの活用
