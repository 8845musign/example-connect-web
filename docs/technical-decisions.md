# 技術的決定事項

最終更新日: 2025年1月21日
バージョン: v2対応版

## なぜこの技術スタックを選んだか

### React Router v7 (Framework Mode) を選択した理由

1. **最新のWeb開発パラダイム**
   - Remix の思想を継承した次世代ルーティング
   - ファイルベースルーティングによる直感的な構造
   - 宣言的なデータフェッチング

2. **Server Component を使わない理由**
   - 学習の焦点をクライアントサイドのストリーミングに集中
   - connect-web との統合をシンプルに保つ
   - 既存のReactの知識を最大限活用

3. **Framework Mode の利点**
   - ビルトインのコード分割
   - 最適化されたビルド設定
   - 開発体験の向上

### connect-web v2 を選択した理由

1. **gRPCの利点**
   - 強力な型安全性（Protocol Buffers）
   - 効率的なバイナリ形式
   - ストリーミングのネイティブサポート

2. **WebSocketとの比較**
   - より構造化されたAPI設計
   - 自動的なコード生成
   - エラーハンドリングの標準化
   - HTTP/2ベースで既存インフラとの親和性

3. **REST APIとの比較**
   - リアルタイムストリーミングの優位性
   - 双方向通信のサポート
   - 帯域幅の効率的な使用
   - スキーマファーストな開発

## アーキテクチャの決定事項

### 1. モノレポ構造

```
.
├── backend/    # Node.jsバックエンド
├── frontend/   # Reactフロントエンド
└── proto/      # 共有Protocol Buffers定義
```

**理由**：

- Protocol Buffers定義の一元管理
- フロントエンドとバックエンドの同期的な開発
- 統合テストの容易さ

### 2. データフロー設計

**プッシュベースのアーキテクチャ**：

- サーバーが能動的にデータを送信
- クライアントは受信に専念
- リアルタイム性の確保

**フィルタリングの実装場所**：

- サーバーサイドでフィルタリング
- ネットワーク帯域の節約
- クライアントの負荷軽減

### 3. 状態管理

**React の組み込み状態管理を使用**：

- useState/useReducer で十分
- 外部ライブラリの学習コストを削減
- ストリーミングデータに適した設計

**メモリ管理戦略**：

- 最新N件のみ保持
- 古いデータの自動破棄
- メモリリークの防止

## 実装の詳細決定

### 1. エラーハンドリング戦略

```typescript
// 3層のエラーハンドリング
1. ストリームレベル: 接続エラー、タイムアウト
2. ルートレベル: ErrorBoundary による UI エラー
3. アプリケーションレベル: グローバルエラーハンドラー
```

### 2. パフォーマンス最適化

**レンダリング最適化**：

- React.memo による不要な再レンダリング防止
- useMemo/useCallback の適切な使用
- 仮想スクロールによる大量データの表示

**ネットワーク最適化**：

- データのバッチング
- 適切なストリーミング間隔
- 圧縮の活用

### 3. 開発体験の向上

**型安全性**：

- Protocol Buffers による自動型生成
- TypeScript の strict mode
- 型推論の最大活用
- @bufbuild/protobuf v2 の新しい型システム

**デバッグ機能**：

- ストリーミングデータのログ出力
- 接続状態の可視化
- エラーの詳細表示

## トレードオフと代替案

### 1. Server Component を使わないトレードオフ

**メリット**：

- シンプルな実装
- 既存のReact知識の活用
- ストリーミングに集中

**デメリット**：

- 初期表示の遅延
- SEOの制限
- サーバーリソースの未活用

### 2. 状態管理ライブラリを使わないトレードオフ

**メリット**：

- 学習コストの削減
- バンドルサイズの削減
- シンプルなデータフロー

**デメリット**：

- 複雑な状態管理の困難さ
- デバッグツールの不足
- 状態の永続化の手間

### 3. モックデータ vs 実データ

**モックデータを選択した理由**：

- 学習に集中できる
- 環境構築の簡素化
- 予測可能な動作

**実データ統合への道筋**：

- インターフェースは実運用を想定
- データソースの差し替えが容易
- 段階的な移行が可能

## 将来の拡張性

### 1. 認証機能の追加

```typescript
// インターセプターによる認証
transport.interceptors.push(authInterceptor);
```

### 2. データ永続化

```typescript
// ストリーミングデータの保存
interface DataStore {
  save(data: MetricData[]): Promise<void>;
  load(timeRange: TimeRange): Promise<MetricData[]>;
}
```

### 3. マルチテナント対応

```typescript
// コンテキストベースの分離
interface TenantContext {
  tenantId: string;
  permissions: Permission[];
}
```

## v2 への移行について

### @bufbuild/protobuf v2 の採用理由

1. **よりシンプルなAPI**
   - クラスベースからファンクションベースへ
   - `create()` 関数による統一的なメッセージ生成
   - より直感的なスキーマアクセス

2. **パフォーマンスの向上**
   - より効率的なシリアライゼーション
   - メモリ使用量の削減
   - バンドルサイズの最適化

3. **開発体験の改善**
   - buf.gen.yaml の簡素化（connect-es プラグイン不要）
   - より良いTypeScript統合
   - エラーメッセージの改善

### 移行時の主な変更点

1. **インポートパスの変更**

   ```typescript
   // v1
   import { ServiceName } from './service_connect';

   // v2
   import { ServiceName } from './service_pb';
   ```

2. **タイムスタンプの扱い**

   ```typescript
   // v1
   import { Timestamp } from '@bufbuild/protobuf';

   // v2
   import { timestampDate, timestampNow } from '@bufbuild/protobuf/wkt';
   ```

3. **メッセージの作成**

   ```typescript
   // v1
   const message = new MessageType();

   // v2
   const message = create(MessageSchema, {});
   ```

これらの決定事項により、学習に最適化されつつ、実運用への移行も視野に入れた設計となっています。v2への移行により、より現代的でパフォーマンスの高いシステムが実現されています。
