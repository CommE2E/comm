// @flow

import type { $Request } from 'express';

import { getAppURLFactsFromRequestURL } from './urls.js';

function assertSecureRequest(req: $Request) {
  const { https, proxy } = getAppURLFactsFromRequestURL(req.originalUrl);
  if (!https) {
    return;
  }
  if (
    (proxy === 'none' && req.protocol !== 'https') ||
    (proxy === 'apache' && req.get('X-Forwarded-SSL') !== 'on')
  ) {
    throw new Error('insecure request');
  }
}

export { assertSecureRequest };
