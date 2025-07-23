// @flow

import { isDev } from '../utils/dev-utils.js';

type BackupServiceConfig = {
  +url: string,
};

const config: BackupServiceConfig = {
  url: isDev ? 'http://192.168.100.9:50052' : 'https://backup.commtechnologies.org',
};

export default config;
