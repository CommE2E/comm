// @flow

import { generateNonce } from 'siwe';

import type { SIWENonceResponse } from 'lib/types/siwe-types';

import { createSIWENonceEntry } from '../creators/siwe-nonce-creator';

async function siweNonceResponder(): Promise<SIWENonceResponse> {
  const generatedNonce = generateNonce();
  await createSIWENonceEntry(generatedNonce);
  return { nonce: generateNonce() };
}

export { siweNonceResponder };
