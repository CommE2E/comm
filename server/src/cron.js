// @flow

import schedule from 'node-schedule';
import cluster from 'cluster';

import { deleteExpiredCookies } from './deleters/cookie-deleters';
import { deleteExpiredVerifications } from './models/verification';
import { deleteInaccessibleThreads } from './deleters/thread-deleters';

if (cluster.isMaster) {
  schedule.scheduleJob(
    '30 3 * * *',
    async () => {
      // Do everything one at a time to reduce load since we're in no hurry
      await deleteExpiredCookies();
      await deleteExpiredVerifications();
      await deleteInaccessibleThreads();
    },
  );
}
