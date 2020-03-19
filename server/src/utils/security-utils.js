// @flow

import type { $Request } from 'express';

import urlFacts from '../../facts/url';

const { https } = urlFacts;

function assertSecureRequest(req: $Request) {
  if (https && req.get('X-Forwarded-SSL') !== 'on') {
    throw new Error('insecure request');
  }
}

export { assertSecureRequest };
