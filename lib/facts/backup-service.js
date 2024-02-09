// @flow

import { isDev } from '../utils/dev-utils.js';

type BackupServiceConfig = {
  +url: string,
};

const config: BackupServiceConfig = {
  url: isDev
    ? 'https://backup.staging.commtechnologies.org'
    : 'https://backup.commtechnologies.org',
};

export default config;
