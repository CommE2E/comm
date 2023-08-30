// @flow

import { isDev } from '../utils/dev-utils.js';

const reportsServiceURL: string = isDev
  ? 'https://reports.staging.commtechnologies.org'
  : 'https://reports.commtechnologies.org';

type ReportsServiceHTTPEndpoint = {
  +path: '/reports',
  +method: 'POST',
};

const sendReportEndpoint: ReportsServiceHTTPEndpoint = Object.freeze({
  path: `/reports`,
  method: 'POST',
});

export { reportsServiceURL, sendReportEndpoint };
