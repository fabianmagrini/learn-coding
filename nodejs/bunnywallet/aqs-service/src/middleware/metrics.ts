import { Request, Response, NextFunction } from 'express';
import { recordHttpRequest } from '../telemetry/metrics';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Capture the original res.send
  const originalSend = res.send;

  res.send = function (data: any) {
    const duration = Date.now() - start;
    const route = req.route?.path || req.path;
    recordHttpRequest(route, req.method, res.statusCode, duration);

    return originalSend.call(this, data);
  };

  next();
}
