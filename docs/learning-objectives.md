# 学習目標

最終更新日: 2025年1月21日
バージョン: v2対応版

このサンプルアプリケーションを通じて、以下の最新技術要素を実践的に学習できます。

## React Router v7 (Framework Mode)

### 1. 基本概念

- **Framework Mode** の理解
- **File-based routing** の実装
- **Nested routes** の活用
- **Route loaders** によるデータフェッチ

### 2. 高度な機能

- **並列データローディング**
  - 複数のデータソースから同時にデータ取得
  - ローディング状態の統合管理

- **エラーハンドリング**
  - ErrorBoundaryの実装
  - ルートレベルでのエラー処理

- **URLベースの状態管理**
  - フィルター条件のURL同期
  - ブラウザバック/フォワードへの対応

### 3. パフォーマンス最適化

- **Code splitting** の自動化
- **Prefetching** によるナビゲーション高速化
- **Optimistic UI** の実装パターン

## connect-web v2 ストリーミング

### 1. Server Streaming RPC

- **実装パターン**

  ```typescript
  // 継続的なデータ受信
  for await (const data of stream) {
    // データ処理
  }
  ```

- **学習ポイント**
  - 非同期イテレーターの使用
  - ストリームのライフサイクル管理
  - メモリリークの防止
  - AbortControllerによるキャンセル処理

### 2. Bidirectional Streaming RPC

- **双方向通信の実装**
  - クライアントからのリクエスト送信
  - サーバーからのレスポンス受信
  - 動的なクエリ更新

- **実践的なユースケース**
  - リアルタイムフィルタリング
  - インタラクティブな検索
  - 動的な設定変更

### 3. エラーハンドリングとリトライ

- **接続エラーの処理**
  - ネットワーク断絶への対応
  - 自動リトライ機構
  - エクスポネンシャルバックオフ

- **バックプレッシャー制御**
  - クライアント側での流量制御
  - メモリ使用量の最適化

## 統合パターン

### 1. React Router + connect-web

- **ルートローダーでの初期データ取得**

  ```typescript
  export const loader = async () => {
    // Unary RPCで初期データ取得
    const summary = await client.getMetricSummary();
    return { summary };
  };
  ```

- **コンポーネントでのストリーミング接続**
  ```typescript
  useEffect(() => {
    // ルート遷移時にストリーム接続
    const stream = client.streamMetrics();
    // ...
  }, [params]);
  ```

### 2. 状態管理パターン

- **ストリーミングデータの状態管理**
  - Reactの状態としての管理
  - データの累積と破棄
  - パフォーマンスの考慮

- **URL状態との同期**
  - フィルター条件のURL反映
  - ディープリンクへの対応

### 3. エラー境界の統合

- **ルートレベルのエラー処理**
- **ストリーミングエラーの伝播**
- **ユーザーフレンドリーなエラー表示**

## @bufbuild/protobuf v2 の新機能

### 1. シンプル化されたAPI

- **関数ベースのAPI設計**

  ```typescript
  // v2の新しいメッセージ作成
  const message = create(MessageSchema, { field: value });
  ```

- **スキーマ駆動開発**
  - スキーマオブジェクトへの直接アクセス
  - 型推論の向上

### 2. Well-Known Typesの扱い

- **タイムスタンプ操作**

  ```typescript
  import { timestampNow, timestampDate } from '@bufbuild/protobuf/wkt';
  ```

- **JSONシリアライゼーション**
  ```typescript
  const json = toJson(MessageSchema, message);
  ```

### 3. パフォーマンス最適化

- **バンドルサイズの削減**
- **ランタイムパフォーマンスの向上**
- **Tree-shakingの改善**

## 実践的な学習成果

### 1. リアルタイムアプリケーションの構築

- WebSocketの代替としてのgRPCストリーミング
- 効率的なデータ転送（Protocol Buffers）
- 型安全なAPI通信

### 2. モダンなReactアプリケーション設計

- Framework Modeによる開発体験の向上
- ファイルベースルーティングの活用
- 宣言的なデータフェッチング

### 3. プロダクション対応の考慮

- エラーハンドリング
- パフォーマンス最適化
- スケーラビリティ

## 発展的な学習

このサンプルを基に、以下の要素を追加実装することでさらに深い学習が可能：

1. **認証・認可**
   - JWTトークンの実装
   - ストリーミング接続での認証

2. **データ永続化**
   - メトリクスデータの保存
   - 履歴データの表示

3. **アラート機能**
   - しきい値の設定
   - リアルタイム通知

4. **マルチテナント対応**
   - 複数のデータソース
   - 権限管理
