// @flow

const reportsServiceURL = 'https://reports.commtechnologies.org';

type ReportsServiceHTTPEndpoint = {
  +path: '/reports',
  +method: 'POST',
};

const sendReportEndpoint: ReportsServiceHTTPEndpoint = Object.freeze({
  path: `/reports`,
  method: 'POST',
});

export { reportsServiceURL, sendReportEndpoint };
