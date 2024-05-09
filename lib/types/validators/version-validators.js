// @flow

import t, { type TInterface } from 'tcomb';

import { tShape, tUserID } from '../../utils/validation-utils.js';
import type { VersionResponse } from '../device-types.js';

export const versionResponseValidator: TInterface<VersionResponse> =
  tShape<VersionResponse>({
    codeVersion: t.Number,
    ownerUsername: t.maybe(t.String),
    ownerID: t.maybe(tUserID),
  });
