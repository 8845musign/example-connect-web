# Issue #002: ストリームエラー時の自動再接続機能を実装

## 概要
現在のストリーミング実装では、ネットワークエラーや接続断が発生した場合、エラーを表示するだけで自動的に再接続されない。ユーザーはページをリロードする必要がある。

## 現状
- `useMetricsStream` フックでエラーハンドリングは実装済み（47-52行目）
- エラー発生時は `setError` でエラー状態を設定するのみ
- 再接続のロジックは存在しない

## 期待される動作
1. ストリームエラーが発生した場合、自動的に再接続を試行
2. 指数バックオフアルゴリズムで再試行間隔を調整（例：1秒→2秒→4秒→8秒）
3. 最大再試行回数または最大待機時間の制限
4. 再接続中はUIに状態を表示
5. 手動での再接続ボタンも提供

## 実装案
```typescript
// 再接続パラメータ
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const MAX_RETRY_ATTEMPTS = 5;

// 再接続ロジック
- エラー発生時に再試行カウンターをインクリメント
- setTimeout で遅延後に再接続
- 成功したらカウンターをリセット
```

## 考慮事項
- AbortController による適切なクリーンアップ
- コンポーネントのアンマウント時は再接続をキャンセル
- ネットワーク状態の監視（navigator.onLine）

## 関連ファイル
- `frontend/app/lib/hooks/useMetricsStream.ts`
- `frontend/app/routes/metrics.$type.tsx`
- `frontend/app/routes/logs.tsx`
- `frontend/app/routes/interactive.tsx`

## 優先度
高