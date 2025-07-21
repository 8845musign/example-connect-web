import type { MetricSummary } from '~/lib/proto/monitoring/v1/metrics_pb';
import { timestampDate } from '@bufbuild/protobuf/wkt';
import type { Timestamp } from '@bufbuild/protobuf/wkt';

interface MetricsSummaryProps {
  summary: MetricSummary | null;
  unit: string;
}

export function MetricsSummary({ summary, unit }: MetricsSummaryProps) {
  if (!summary) {
    return (
      <div className="metrics-summary loading">
        <p>サマリーデータを読み込んでいます...</p>
      </div>
    );
  }

  const formatTime = (timestamp: Timestamp | string | undefined) => {
    if (!timestamp) return '-';
    // If it's already a string (from JSON serialization), parse it
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toLocaleString('ja-JP');
    }
    // If it's a Timestamp object, use timestampDate
    return timestampDate(timestamp).toLocaleString('ja-JP');
  };

  return (
    <div className="metrics-summary">
      <h3>メトリクスサマリー</h3>
      <div className="summary-grid">
        <div className="summary-item">
          <span className="label">最小値</span>
          <span className="value">
            {summary.min.toFixed(2)} {unit}
          </span>
        </div>
        <div className="summary-item">
          <span className="label">最大値</span>
          <span className="value">
            {summary.max.toFixed(2)} {unit}
          </span>
        </div>
        <div className="summary-item">
          <span className="label">平均値</span>
          <span className="value">
            {summary.avg.toFixed(2)} {unit}
          </span>
        </div>
        <div className="summary-item">
          <span className="label">データポイント数</span>
          <span className="value">{summary.count?.toString() || '0'}</span>
        </div>
        <div className="summary-item full-width">
          <span className="label">期間</span>
          <span className="value">
            {formatTime(summary.startTime)} 〜 {formatTime(summary.endTime)}
          </span>
        </div>
      </div>
    </div>
  );
}
