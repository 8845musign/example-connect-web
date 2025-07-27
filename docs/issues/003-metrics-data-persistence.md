# Issue #003: メトリクスデータのローカルストレージキャッシュ機能を追加

## 概要
現在、メトリクスデータはメモリ上に最新100件のみ保持される。ページをリロードするとデータが失われ、履歴データの参照ができない。

## 現状
- `useMetricsStream.ts` の43-44行目で配列を100件に制限
- データはReactの状態でのみ管理
- ブラウザリロード時にすべてのデータが失われる

## 期待される動作
1. メトリクスデータをローカルストレージまたはIndexedDBに保存
2. ページリロード時に過去のデータを復元
3. 古いデータの自動削除（例：24時間以上前のデータ）
4. データサイズの上限管理
5. データのエクスポート機能（CSV、JSON）

## 実装案

### ストレージ構造
```typescript
interface StoredMetrics {
  metricType: string;
  data: MetricData[];
  lastUpdated: number;
}
```

### 機能要件
1. **保存タイミング**
   - 新しいデータ受信時（バッチ処理で効率化）
   - コンポーネントのアンマウント時

2. **データ管理**
   - メトリクスタイプごとに分離して保存
   - タイムスタンプベースの自動削除
   - 圧縮オプション（大量データ対応）

3. **パフォーマンス考慮**
   - Web Workerでの非同期処理
   - デバウンスによる書き込み頻度の制御

## 技術選択
- **IndexedDB**: 大容量データ、構造化データの保存に適している
- **LocalStorage**: シンプルだが5MB制限あり
- 推奨：IndexedDBをDexie.jsなどのラッパーで使用

## 関連ファイル
- `frontend/app/lib/hooks/useMetricsStream.ts`
- 新規作成: `frontend/app/lib/storage/metricsStorage.ts`

## 優先度
中