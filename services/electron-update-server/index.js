// @flow

import express from 'express';
import hazel from 'hazel-server';

const hazelServer = hazel({
  // Cache refresh interval (in minutes)
  interval: 15,
  repository: process.env.HAZEL_REPOSITORY ?? 'comm',
  account: process.env.HAZEL_ACCOUNT ?? 'CommE2e',
});

const app = express();
app.all('*', (req, res) => {
  hazelServer(req, res);
});

app.listen(parseInt(process.env.HAZEL_PORT, 10) || 80);
