// @flow

import { generateNonce } from 'siwe';

import type { SIWENonceResponse } from 'lib/types/siwe-types.js';

async function siweNonceResponder(): Promise<SIWENonceResponse> {
  return { nonce: generateNonce() };
}

export { siweNonceResponder };
