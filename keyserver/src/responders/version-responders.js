// @flow

import t, { type TInterface } from 'tcomb';

import { webAndKeyserverCodeVersion } from 'lib/facts/version.js';
import type { VersionResponse } from 'lib/types/device-types.js';
import { tShape } from 'lib/utils/validation-utils.js';

export const versionResponseValidator: TInterface<VersionResponse> =
  tShape<VersionResponse>({ codeVersion: t.Number });

const versionResponse = { codeVersion: webAndKeyserverCodeVersion };

async function versionResponder(): Promise<VersionResponse> {
  return versionResponse;
}

export { versionResponder };
