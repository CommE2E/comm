// @flow

import { generateNonce } from 'siwe';

import type { SIWENonceResponse } from 'lib/types/siwe-types.js';

import { createSIWENonceEntry } from '../creators/siwe-nonce-creator.js';

async function siweNonceResponder(): Promise<SIWENonceResponse> {
  const generatedNonce = generateNonce();
  await createSIWENonceEntry(generatedNonce);
  return { nonce: generatedNonce };
}

export { siweNonceResponder };
