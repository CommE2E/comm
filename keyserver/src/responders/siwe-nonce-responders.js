// @flow

import { generateNonce } from 'siwe';
import t, { type TInterface } from 'tcomb';

import type { SIWENonceResponse } from 'lib/types/siwe-types.js';
import { tShape } from 'lib/utils/validation-utils.js';

import { createSIWENonceEntry } from '../creators/siwe-nonce-creator.js';

export const siweNonceResponseValidator: TInterface<SIWENonceResponse> =
  tShape<SIWENonceResponse>({ nonce: t.String });

async function siweNonceResponder(): Promise<SIWENonceResponse> {
  const generatedNonce = generateNonce();
  await createSIWENonceEntry(generatedNonce);
  return {
    nonce: generatedNonce,
  };
}

export { siweNonceResponder };
