import type { MetricData } from '../proto/gen/monitoring/v1/metrics_pb.js';
import { MetricDataSchema } from '../proto/gen/monitoring/v1/metrics_pb.js';
import { create } from '@bufbuild/protobuf';
import { timestampNow } from '@bufbuild/protobuf/wkt';

export class MetricsGenerator {
  private counters: Map<string, number> = new Map();

  generateMetric(metricType: string): MetricData {
    const id = `metric_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    
    let value: number;
    let unit: string;
    const labels: Record<string, string> = {
      host: `server-${Math.floor(Math.random() * 5) + 1}`,
      region: ['us-east', 'us-west', 'eu-central', 'ap-south'][Math.floor(Math.random() * 4)],
    };

    switch (metricType) {
      case 'cpu_usage':
        value = this.generateCPUUsage();
        unit = 'percent';
        labels.core = `core-${Math.floor(Math.random() * 8)}`;
        break;
      
      case 'memory_usage':
        value = this.generateMemoryUsage();
        unit = 'percent';
        labels.type = Math.random() > 0.5 ? 'heap' : 'rss';
        break;
      
      case 'disk_io':
        value = this.generateDiskIO();
        unit = 'MB/s';
        labels.device = `sda${Math.floor(Math.random() * 4) + 1}`;
        labels.operation = Math.random() > 0.5 ? 'read' : 'write';
        break;
      
      case 'network_io':
        value = this.generateNetworkIO();
        unit = 'Mbps';
        labels.interface = `eth${Math.floor(Math.random() * 3)}`;
        labels.direction = Math.random() > 0.5 ? 'in' : 'out';
        break;
      
      case 'request_rate':
        value = this.generateRequestRate();
        unit = 'req/s';
        labels.endpoint = ['/api/users', '/api/products', '/api/orders', '/api/analytics'][
          Math.floor(Math.random() * 4)
        ];
        labels.method = ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)];
        break;
      
      case 'error_rate':
        value = this.generateErrorRate();
        unit = 'errors/min';
        labels.service = ['auth', 'api', 'database', 'cache'][Math.floor(Math.random() * 4)];
        labels.errorType = ['timeout', 'validation', 'server', 'client'][Math.floor(Math.random() * 4)];
        break;
      
      case 'latency':
        value = this.generateLatency();
        unit = 'ms';
        labels.percentile = ['p50', 'p90', 'p95', 'p99'][Math.floor(Math.random() * 4)];
        labels.service = ['frontend', 'backend', 'database'][Math.floor(Math.random() * 3)];
        break;
      
      default:
        value = Math.random() * 100;
        unit = 'units';
    }

    return create(MetricDataSchema, {
      id,
      metricType,
      value,
      timestamp: timestampNow(),
      labels,
      unit,
    });
  }

  private generateCPUUsage(): number {
    // CPUは40-80%の間で波状に変動
    const base = 60;
    const amplitude = 20;
    const noise = (Math.random() - 0.5) * 10;
    return Math.max(0, Math.min(100, base + amplitude * Math.sin(Date.now() / 10000) + noise));
  }

  private generateMemoryUsage(): number {
    // メモリは緩やかに増加し、時々ガベージコレクションで減少
    const counter = this.counters.get('memory') || 50;
    let newValue = counter + (Math.random() - 0.3) * 5;
    
    // 10%の確率でGC
    if (Math.random() < 0.1) {
      newValue = newValue * 0.7;
    }
    
    newValue = Math.max(30, Math.min(95, newValue));
    this.counters.set('memory', newValue);
    return newValue;
  }

  private generateDiskIO(): number {
    // バースト的なI/O活動
    if (Math.random() < 0.2) {
      return 50 + Math.random() * 150;
    }
    return Math.random() * 30;
  }

  private generateNetworkIO(): number {
    // 通常のトラフィックとスパイク
    if (Math.random() < 0.15) {
      return 100 + Math.random() * 400;
    }
    return 10 + Math.random() * 50;
  }

  private generateRequestRate(): number {
    // 時間帯によって変動するリクエストレート
    const hour = new Date().getHours();
    const baseRate = hour >= 9 && hour <= 17 ? 1000 : 300;
    return baseRate + (Math.random() - 0.5) * 200;
  }

  private generateErrorRate(): number {
    // 低い基準値で時々スパイク
    if (Math.random() < 0.05) {
      return 10 + Math.random() * 50;
    }
    return Math.random() * 5;
  }

  private generateLatency(): number {
    // 正規分布風のレイテンシ
    const base = 50;
    const variance = 20;
    let latency = base + (Math.random() - 0.5) * variance;
    
    // 5%の確率で高レイテンシ
    if (Math.random() < 0.05) {
      latency = 200 + Math.random() * 300;
    }
    
    return Math.max(1, latency);
  }
}