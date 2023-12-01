// @flow

import express from 'express';
// eslint-disable-next-line prettier/prettier
/*:: import type { $Request, $Response } from 'express'; */
import hazel from 'hazel-server';

const hazelServer = hazel({
  // Cache refresh interval (in minutes)
  interval: 15,
  repository: process.env.HAZEL_REPOSITORY ?? 'comm',
  account: process.env.HAZEL_ACCOUNT ?? 'CommE2E',
});

const app = express();
app.all('*', (req /*: $Request */, res /*: $Response */) => {
  hazelServer(req, res);
});

app.listen(parseInt(process.env.HAZEL_PORT, 10) || 80);
