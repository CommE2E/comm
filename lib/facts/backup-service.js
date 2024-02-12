// @flow

import { isDev } from '../utils/dev-utils.js';

type BackupServiceConfig = {
  +url: string,
};

const config: BackupServiceConfig = {
  url: isDev ? 'http://127.0.0.1:50052' : 'https://backup.commtechnologies.org',
};

export default config;
