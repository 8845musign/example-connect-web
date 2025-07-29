import { useLoaderData } from 'react-router';
import type { ClientLoaderFunctionArgs } from 'react-router';
import { useState, useMemo } from 'react';
import { monitoringClient } from '~/lib/client';
import { MetricsChart } from '~/components/MetricsChart';
import { MetricsSummary } from '~/components/MetricsSummary';
import { useMetricsStream } from '~/lib/hooks/useMetricsStream';
import { create } from '@bufbuild/protobuf';
import { TimestampSchema } from '@bufbuild/protobuf/wkt';

export const clientLoader = async ({ params }: ClientLoaderFunctionArgs) => {
  const metricType = params.type!;

  try {
    const response = await monitoringClient.getMetricSummary({
      metricType,
      startTime: create(TimestampSchema, {
        seconds: BigInt(Math.floor((Date.now() - 3600000) / 1000)),
        nanos: 0,
      }),
      endTime: create(TimestampSchema, {
        seconds: BigInt(Math.floor(Date.now() / 1000)),
        nanos: 0,
      }),
    });

    return {
      summary: response.summary ?? null,
      metricType,
    };
  } catch (error) {
    console.error('Failed to fetch metric summary:', error);
    return {
      summary: null,
      metricType,
    };
  }
};

export default function MetricDetail() {
  const { summary, metricType } = useLoaderData<typeof clientLoader>();
  const [intervalMs, setIntervalMs] = useState(1000);

  // useMemoで配列の再生成を防ぐ
  const metricTypes = useMemo(() => [metricType], [metricType]);
  const { data, error, loading } = useMetricsStream(metricTypes, intervalMs);

  const metricInfo = {
    cpu_usage: { name: 'CPU使用率', unit: '%', color: '#ff6b6b' },
    memory_usage: { name: 'メモリ使用率', unit: '%', color: '#4ecdc4' },
    network_io: { name: 'ネットワークI/O', unit: 'Mbps', color: '#45b7d1' },
    disk_io: { name: 'ディスクI/O', unit: 'MB/s', color: '#96ceb4' },
    request_rate: { name: 'リクエストレート', unit: 'req/s', color: '#feca57' },
    error_rate: { name: 'エラーレート', unit: 'errors/min', color: '#ff9ff3' },
    latency: { name: 'レイテンシ', unit: 'ms', color: '#54a0ff' },
  }[metricType] || { name: metricType, unit: 'units', color: '#dfe6e9' };

  return (
    <div className="metric-detail">
      <header className="metric-header">
        <h2>{metricInfo.name}</h2>
        <div className="metric-status">
          {loading && <span className="status loading">接続中...</span>}
          {error && <span className="status error">エラー: {error.message}</span>}
          {!loading && !error && data.length > 0 && (
            <span className="status connected">接続済み</span>
          )}
        </div>
      </header>

      {summary && <MetricsSummary summary={summary} unit={metricInfo.unit} />}

      <div className="chart-container">
        <MetricsChart data={data} metricInfo={metricInfo} height={400} />
      </div>

      <div className="metric-controls">
        <h3>フィルター</h3>
        <div className="controls">
          <label>
            更新間隔:
            <select value={intervalMs} onChange={(e) => setIntervalMs(Number(e.target.value))}>
              <option value="1000">1秒</option>
              <option value="2000">2秒</option>
              <option value="5000">5秒</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
