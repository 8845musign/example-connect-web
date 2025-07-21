import { useMemo } from 'react';
import type { MetricData } from '~/lib/proto/monitoring/v1/metrics_pb';
import { timestampDate } from '@bufbuild/protobuf/wkt';

interface MetricsChartProps {
  data: MetricData[];
  metricInfo: {
    name: string;
    unit: string;
    color: string;
  };
  height?: number;
}

export function MetricsChart({ data, metricInfo, height = 300 }: MetricsChartProps) {
  const chartData = useMemo(() => {
    return data.map((metric) => ({
      time: metric.timestamp
        ? timestampDate(metric.timestamp).toLocaleTimeString('ja-JP')
        : new Date().toLocaleTimeString('ja-JP'),
      value: metric.value,
      labels: metric.labels,
    }));
  }, [data]);

  // 簡易的なチャート実装（実際のプロジェクトではrechartsなどを使用）
  const maxValue = Math.max(...data.map((d) => d.value), 100);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;

  return (
    <div className="metrics-chart" style={{ height }}>
      <div className="chart-header">
        <h3>{metricInfo.name}</h3>
        {data.length > 0 && (
          <div className="current-value">
            <span className="value">{data[data.length - 1]?.value.toFixed(2)}</span>
            <span className="unit">{metricInfo.unit}</span>
          </div>
        )}
      </div>

      <div className="chart-body">
        <svg width="100%" height={height - 60} viewBox={`0 0 800 ${height - 60}`}>
          {/* Y軸のグリッドライン */}
          {[0, 25, 50, 75, 100].map((percent) => (
            <g key={percent}>
              <line
                x1="50"
                y1={(height - 60) * (1 - percent / 100)}
                x2="750"
                y2={(height - 60) * (1 - percent / 100)}
                stroke="#e0e0e0"
                strokeDasharray="2,2"
              />
              <text
                x="40"
                y={(height - 60) * (1 - percent / 100) + 5}
                textAnchor="end"
                fontSize="12"
                fill="#666"
              >
                {(minValue + (range * percent) / 100).toFixed(0)}
              </text>
            </g>
          ))}

          {/* データポイントとライン */}
          {chartData.length > 1 && (
            <polyline
              fill="none"
              stroke={metricInfo.color}
              strokeWidth="2"
              points={chartData
                .map((point, index) => {
                  const x = 50 + (700 / (chartData.length - 1)) * index;
                  const y = (height - 60) * (1 - (point.value - minValue) / range);
                  return `${x},${y}`;
                })
                .join(' ')}
            />
          )}

          {/* データポイント */}
          {chartData.map((point, index) => {
            const x = 50 + (700 / Math.max(chartData.length - 1, 1)) * index;
            const y = (height - 60) * (1 - (point.value - minValue) / range);

            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill={metricInfo.color}
                className="data-point"
              >
                <title>{`${point.time}: ${point.value.toFixed(2)} ${metricInfo.unit}`}</title>
              </circle>
            );
          })}
        </svg>
      </div>

      {/* メタデータ表示 */}
      {data.length > 0 && data[data.length - 1].labels && (
        <div className="chart-metadata">
          {Object.entries(data[data.length - 1].labels).map(([key, value]) => (
            <span key={key} className="label">
              {key}: {value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
