// @flow

import t, { type TInterface } from 'tcomb';

import { webAndKeyserverCodeVersion } from 'lib/facts/version.js';
import type { VersionResponse } from 'lib/types/device-types.js';
import { tShape } from 'lib/utils/validation-utils.js';

import type { Viewer } from '../session/viewer.js';
import { validateOutput } from '../utils/validation-utils.js';

const versionResponseValidator: TInterface<VersionResponse> =
  tShape<VersionResponse>({ codeVersion: t.Number });

async function versionResponder(viewer: Viewer): Promise<VersionResponse> {
  const response = { codeVersion: webAndKeyserverCodeVersion };
  return validateOutput(
    viewer.platformDetails,
    versionResponseValidator,
    response,
  );
}

export { versionResponder };
