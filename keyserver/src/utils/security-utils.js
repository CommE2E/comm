// @flow

import type { $Request } from 'express';

import { getAppURLFacts } from './urls';

const { https } = getAppURLFacts();

function assertSecureRequest(req: $Request) {
  if (https && req.get('X-Forwarded-SSL') !== 'on') {
    throw new Error('insecure request');
  }
}

export { assertSecureRequest };
