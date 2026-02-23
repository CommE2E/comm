// @flow

import { usingStagingServices } from '../utils/using-staging-services.js';

const reportsServiceURL: string = usingStagingServices
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
