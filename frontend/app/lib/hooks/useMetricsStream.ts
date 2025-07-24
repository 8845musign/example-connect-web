import { useEffect, useState, useRef } from 'react';
import { monitoringClient } from '../client';
import type { MetricData } from '../proto/monitoring/v1/metrics_pb';

export function useMetricsStream(metricTypes: string[]) {
  const [data, setData] = useState<MetricData[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Extract the dependency to a separate variable for ESLint
  const metricTypesKey = metricTypes.join(',');

  useEffect(() => {
    // 前回の接続をキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    async function startStream() {
      try {
        setLoading(true);
        setError(null);

        const stream = monitoringClient.streamMetrics(
          {
            metricTypes,
            intervalMs: 1000,
          },
          { signal: abortController.signal },
        );

        setLoading(false);

        for await (const metric of stream) {
          if (abortController.signal.aborted) break;

          setData((prev) => {
            const updated = [...prev, metric];
            // 最新100件のみ保持（メモリ管理）
            return updated.slice(-100);
          });
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(err as Error);
          console.error('Streaming error:', err);
        }
      }
    }

    startStream();

    return () => {
      abortController.abort();
    };
  }, [metricTypes, metricTypesKey]); // metricTypesが変更されたら再接続

  return { data, error, loading };
}
