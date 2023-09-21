// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tShape } from '../utils/validation-utils.js';

export type IntegrityStore = {
  threadHashes: { +[string]: number },
};

export const integrityStoreValidator: TInterface<IntegrityStore> =
  tShape<IntegrityStore>({
    threadHashes: t.dict(tID, t.Number),
  });
