// @flow

import { performance } from 'perf_hooks';

function logEndpointMetrics(req, res, next): void {
  const endpointName = req.url;
  const requestTime = performance.now();

  const onCompletion = () => {
    const responseTime = performance.now();
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
