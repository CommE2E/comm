// @flow

import { usingStagingServices } from '../utils/using-staging-services.js';

type BackupServiceConfig = {
  +url: string,
};

const config: BackupServiceConfig = {
  url: usingStagingServices
    ? 'https://backup.staging.commtechnologies.org'
    : 'https://backup.commtechnologies.org',
};

export default config;
