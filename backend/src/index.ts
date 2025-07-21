import express from 'express';
import cors from 'cors';
import { expressConnectMiddleware } from '@connectrpc/connect-express';
import { MonitoringService } from './proto/gen/monitoring/v1/service_pb.js';
import { MonitoringServiceImpl } from './services/monitoring-service.js';

const app = express();
const PORT = process.env.PORT || 8080;

// CORS設定
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  }),
);

// Connect-RPCミドルウェア
app.use(
  expressConnectMiddleware({
    routes: (router) => {
      router.service(MonitoringService, new MonitoringServiceImpl());
    },
  }),
);

app.listen(PORT, () => {
  console.log(`✨ Backend server is running at http://localhost:${PORT}`);
  console.log(`📡 gRPC-Web endpoint: http://localhost:${PORT}/monitoring.v1.MonitoringService`);
});
