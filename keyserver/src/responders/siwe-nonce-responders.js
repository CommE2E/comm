// @flow

import { generateNonce } from 'siwe';
import t, { type TInterface } from 'tcomb';

import type { SIWENonceResponse } from 'lib/types/siwe-types.js';
import { tShape } from 'lib/utils/validation-utils.js';

import { createSIWENonceEntry } from '../creators/siwe-nonce-creator.js';
import type { Viewer } from '../session/viewer.js';
import { validateOutput } from '../utils/validation-utils.js';

export const siweNonceResponseValidator: TInterface<SIWENonceResponse> =
  tShape<SIWENonceResponse>({ nonce: t.String });

async function siweNonceResponder(viewer: Viewer): Promise<SIWENonceResponse> {
  const generatedNonce = generateNonce();
  await createSIWENonceEntry(generatedNonce);
  return validateOutput(viewer.platformDetails, siweNonceResponseValidator, {
    nonce: generatedNonce,
  });
}

export { siweNonceResponder };
