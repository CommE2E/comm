// @flow

import { replacePathParams, type URLPathParams } from './url-utils.js';
import backupServiceConfig from '../facts/backup-service.js';
import type { BackupServiceHTTPEndpoint } from '../facts/backup-service.js';

function makeBackupServiceEndpointURL(
  endpoint: BackupServiceHTTPEndpoint,
  params: URLPathParams = {},
): string {
  const path = replacePathParams(endpoint.path, params);
  return `${backupServiceConfig.url}${path}`;
}

export { makeBackupServiceEndpointURL };
