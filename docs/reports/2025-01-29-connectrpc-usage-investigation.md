# ConnectRPC使用状況調査レポート

**調査日**: 2025年1月29日  
**対象プロジェクト**: connect-web

## 概要

このプロジェクトは、ConnectRPC v2を使用してリアルタイムストリーミングダッシュボードを実装しています。バックエンドはNode.js/Express、フロントエンドはReact Router v7を使用し、gRPC-Web通信パターンをデモンストレーションしています。

## アーキテクチャ

### 通信フロー
```
[Backend Services] → gRPC/HTTP2 → [connect-node] → [connect-web] → [React UI]
     ↑                                                    ↓
     └─────────── Dynamic Filters ←──────────────────────┘
```

### 使用技術スタック

#### バックエンド
- **フレームワーク**: Node.js + Express
- **ConnectRPCパッケージ**:
  - `@connectrpc/connect`: v2.0.0
  - `@connectrpc/connect-node`: v2.0.0
  - `@connectrpc/connect-express`: v2.0.0
- **プロトコルバッファ**: `@bufbuild/protobuf`: v2.2.0

#### フロントエンド
- **フレームワーク**: React 18 + React Router v7（クライアントサイドレンダリングのみ）
- **ConnectRPCパッケージ**:
  - `@connectrpc/connect`: v2.0.0
  - `@connectrpc/connect-web`: v2.0.0
- **プロトコルバッファ**: `@bufbuild/protobuf`: v2.2.0

## ConnectRPCの実装詳細

### 1. バックエンド実装

#### サーバーセットアップ (backend/src/index.ts:1-31)
```typescript
import { expressConnectMiddleware } from '@connectrpc/connect-express';
import { MonitoringService } from './proto/gen/monitoring/v1/service_pb.js';
import { MonitoringServiceImpl } from './services/monitoring-service.js';

// Connect-RPCミドルウェアの設定
app.use(
  expressConnectMiddleware({
    routes: (router) => {
      router.service(MonitoringService, new MonitoringServiceImpl());
    },
  }),
);
```

#### サービス実装パターン

MonitoringServiceImplでは、以下の4つのRPCパターンを実装:

1. **Unary RPC** - `getMetricSummary` (backend/src/services/monitoring-service.ts:29-44)
   - 単一リクエスト/レスポンス
   - メトリクスサマリーの取得

2. **Server Streaming RPC** - `streamMetrics` (backend/src/services/monitoring-service.ts:46-90)
   - AsyncGeneratorを使用したストリーミング実装
   - AbortSignalによるキャンセレーション対応

3. **Server Streaming RPC** - `streamLogs` (backend/src/services/monitoring-service.ts:92-116)
   - リアルタイムログストリーミング
   - 過去ログの送信オプション付き

4. **Bidirectional Streaming RPC** - `interactiveQuery` (backend/src/services/monitoring-service.ts:118-254)
   - 双方向ストリーミング通信
   - 動的フィルタリングとフロー制御

### 2. フロントエンド実装

#### クライアント設定 (frontend/app/lib/client.ts:1-10)
```typescript
import { createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';

const transport = createConnectTransport({
  baseUrl: 'http://localhost:8080',
});

export const monitoringClient = createClient(MonitoringService, transport);
```

#### ストリーミングフック実装例 (frontend/app/lib/hooks/useMetricsStream.ts:1-61)
- AbortControllerによる適切なクリーンアップ
- メモリ管理（最新100件のみ保持）
- エラーハンドリング

#### 双方向ストリーミングの実装 (frontend/app/routes/interactive.tsx:21-73)
- AsyncGeneratorを使用したリクエストストリーム
- リクエストキューによる非同期処理
- リアルタイムUIアップデート

### 3. Protocol Buffersの構成

#### サービス定義 (proto/monitoring/v1/service.proto)
- 4つのRPCメソッドを定義
- リクエスト/レスポンス型の明確な定義
- Google Well-Known Typesの活用（Timestamp）

#### コード生成設定 (buf.gen.yaml)
```yaml
plugins:
  - remote: buf.build/bufbuild/es:v2.2.0
    out: backend/src/proto/gen
    opt:
      - target=ts
      - import_extension=js
```

## 実装されているgRPCパターン

### 1. Unary RPC
- **用途**: メトリクスサマリーの取得
- **特徴**: 従来のREST APIと同様の単一リクエスト/レスポンス

### 2. Server Streaming
- **用途**: メトリクスとログのリアルタイムストリーミング
- **特徴**: 
  - サーバーからクライアントへの一方向ストリーム
  - 長時間接続の維持
  - バックプレッシャー対応

### 3. Bidirectional Streaming
- **用途**: インタラクティブなクエリと動的フィルタリング
- **特徴**:
  - クライアント・サーバー間の双方向通信
  - リアルタイムでのフィルター更新
  - 一時停止/再開機能

## 主要な実装上の特徴

### 1. エラーハンドリングと接続管理
- AbortControllerによる適切なリソース管理
- 接続エラーの検知と再接続処理
- ストリームのライフサイクル管理

### 2. パフォーマンス最適化
- データの件数制限（最新100件）
- 効率的なストリーミング間隔制御
- メモリリークの防止

### 3. 型安全性
- Protocol Buffersによる型定義
- TypeScriptの完全なサポート
- コード生成による型の一貫性

## まとめ

このプロジェクトは、ConnectRPC v2の機能を最大限に活用し、以下を実現しています：

1. **完全なgRPCパターンの実装**: Unary、Server Streaming、Bidirectional Streamingの全てを実装
2. **型安全な通信**: Protocol BuffersとTypeScriptの組み合わせ
3. **リアルタイム性**: 効率的なストリーミング実装
4. **プロダクションレディ**: エラーハンドリング、リソース管理、パフォーマンス最適化

ConnectRPCは、従来のREST APIでは実現困難なリアルタイムストリーミング機能を、Webアプリケーションで簡単に実装できるようにしています。特に、gRPCの複雑さを隠蔽しながら、その利点を活かせる点が優れています。