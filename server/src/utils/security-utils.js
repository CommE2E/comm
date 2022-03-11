// @flow

import type { $Request } from 'express';

import { getSquadCalURLFacts } from './urls';

const { https } = getSquadCalURLFacts();

function assertSecureRequest(req: $Request) {
  if (https && req.get('X-Forwarded-SSL') !== 'on') {
    throw new Error('insecure request');
  }
}

export { assertSecureRequest };
