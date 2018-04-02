// @flow

import schedule from 'node-schedule';
import cluster from 'cluster';

import { deleteExpiredCookies } from './deleters/cookie-deleters';
import { deleteExpiredVerifications } from './models/verification';

if (cluster.isMaster) {
  schedule.scheduleJob(
    '30 3 * * *',
    async () => {
      await deleteExpiredCookies();
      await deleteExpiredVerifications();
    },
  );
}
