// @flow

import t, { type TInterface } from 'tcomb';

import { webAndKeyserverCodeVersion } from 'lib/facts/version.js';
import type { VersionResponse } from 'lib/types/device-types.js';
import { tShape } from 'lib/utils/validation-utils.js';

import type { Viewer } from '../session/viewer.js';
import { validateOutput } from '../utils/validation-utils.js';

const versionResponseValidator: TInterface<VersionResponse> =
  tShape<VersionResponse>({ codeVersion: t.Number });

const versionResponse = { codeVersion: webAndKeyserverCodeVersion };

async function versionResponder(viewer: Viewer): Promise<VersionResponse> {
  return validateOutput(
    viewer.platformDetails,
    versionResponseValidator,
    versionResponse,
  );
}

export { versionResponder };
