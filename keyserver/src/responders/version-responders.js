// @flow

import t, { type TInterface } from 'tcomb';

import type { VersionResponse } from 'lib/types/device-types.js';
import { tShape } from 'lib/utils/validation-utils.js';

import { keyserverCodeVersion } from '../version.js';

export const versionResponseValidator: TInterface<VersionResponse> =
  tShape<VersionResponse>({ codeVersion: t.Number });

const versionResponse = { codeVersion: keyserverCodeVersion };

async function versionResponder(): Promise<VersionResponse> {
  return versionResponse;
}

export { versionResponder };
