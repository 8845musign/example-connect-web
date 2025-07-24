import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  route('metrics', 'routes/metrics.tsx', [
    index('routes/metrics._index.tsx'),
    route(':type', 'routes/metrics.$type.tsx'),
  ]),
  index('routes/_index.tsx'),
  route('interactive', 'routes/interactive.tsx'),
  route('logs', 'routes/logs.tsx'),
] satisfies RouteConfig;
