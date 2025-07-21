import { Outlet, Link, useLocation } from '@remix-run/react';

export default function MetricsLayout() {
  const location = useLocation();

  const metricTypes = [
    { id: 'cpu_usage', name: 'CPU使用率', icon: '🖥️' },
    { id: 'memory_usage', name: 'メモリ使用率', icon: '💾' },
    { id: 'network_io', name: 'ネットワークI/O', icon: '🌐' },
    { id: 'disk_io', name: 'ディスクI/O', icon: '💿' },
    { id: 'request_rate', name: 'リクエストレート', icon: '📊' },
    { id: 'error_rate', name: 'エラーレート', icon: '⚠️' },
    { id: 'latency', name: 'レイテンシ', icon: '⏱️' },
  ];

  return (
    <div className="metrics-layout">
      <header>
        <h1>メトリクスモニター</h1>
        <Link to="/" className="back-link">
          ← ダッシュボードに戻る
        </Link>
      </header>

      <div className="metrics-container">
        <nav className="metrics-nav">
          <h2>メトリクスタイプ</h2>
          <ul>
            {metricTypes.map((metric) => (
              <li key={metric.id}>
                <Link
                  to={`/metrics/${metric.id}`}
                  className={location.pathname === `/metrics/${metric.id}` ? 'active' : ''}
                >
                  <span className="icon">{metric.icon}</span>
                  <span>{metric.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="metrics-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
