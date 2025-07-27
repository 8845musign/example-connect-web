# Issue #001: メトリクス画面の更新間隔セレクターを機能させる

## 概要
メトリクス詳細画面（`/metrics/:type`）に更新間隔を選択するセレクターが存在するが、現在は見た目だけで実際の機能が実装されていない。

## 現状
- `frontend/app/routes/metrics.$type.tsx` の77-80行目にセレクターUI要素は存在
- 選択肢：1秒、2秒、5秒
- 現在は `useMetricsStream` フックで固定値（1000ms）が使用されている

## 期待される動作
1. ユーザーがセレクターで更新間隔を選択
2. 選択された値に応じてストリーミングの更新間隔が変更される
3. 既存のストリーム接続を切断し、新しい間隔で再接続

## 実装案
1. `useState` で選択された間隔を管理
2. `useMetricsStream` フックに `intervalMs` パラメータを追加
3. セレクターの `onChange` イベントで状態を更新
4. フック内で間隔が変更されたら自動的に再接続

## 関連ファイル
- `frontend/app/routes/metrics.$type.tsx`
- `frontend/app/lib/hooks/useMetricsStream.ts`

## 優先度
高