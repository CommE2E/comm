// @flow

import fs from 'fs';
import path from 'path';

import { main } from './utils.js';
import { createPickledOlmAccount } from '../utils/olm-objects.js';

const olmConfigRelativePath = './secrets/olm_config.json';

async function generateOlmConfig() {
  const { picklingKey, pickledAccount } = await createPickledOlmAccount();

  const olmConfig = {
    picklingKey: picklingKey,
    pickledAccount: pickledAccount,
  };
  const scriptWorkingDirectory = path.resolve();

  if (!scriptWorkingDirectory.endsWith('comm/keyserver')) {
    throw new Error(
      'Script must be run in keyserver directory in comm project.',
    );
  }

  const olmConfigFilePath = path.join(
    scriptWorkingDirectory,
    olmConfigRelativePath,
  );

  fs.writeFileSync(olmConfigFilePath, JSON.stringify(olmConfig));
}

main([generateOlmConfig]);
