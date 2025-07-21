import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { MonitoringService } from "./proto/monitoring/v1/service_pb.js";

const transport = createConnectTransport({
  baseUrl: "http://localhost:8080",
});

export const monitoringClient = createClient(MonitoringService, transport);