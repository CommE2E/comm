// @flow

import type { $Request, $Response, NextFunction } from 'express';

function logEndpointMetrics(
  req: $Request,
  res: $Response,
  next: NextFunction,
): void {
  const endpointName = req.url;
  const requestTime = Date.now();

  const onCompletion = () => {
    const responseTime = Date.now();
    const endpointDuration = responseTime - requestTime;
    const contentSize = res.get('Content-Length') ?? 'NaN';
    console.log(
      `${endpointName}, ${endpointDuration.toFixed(2)}ms, ${contentSize} bytes`,
    );
  };

  res.on('finish', onCompletion);

  next();
}

export { logEndpointMetrics };
