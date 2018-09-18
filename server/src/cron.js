// @flow

import schedule from 'node-schedule';
import cluster from 'cluster';

import { deleteExpiredCookies } from './deleters/cookie-deleters';
import { deleteExpiredVerifications } from './models/verification';
import { deleteInaccessibleThreads } from './deleters/thread-deleters';
import { deleteOrphanedDays } from './deleters/day-deleters';
import { deleteOrphanedMemberships } from './deleters/membership-deleters';
import { deleteOrphanedEntries } from './deleters/entry-deleters';
import { deleteOrphanedRevisions } from './deleters/revision-deleters';
import { deleteOrphanedRoles } from './deleters/role-deleters';
import { deleteOrphanedMessages } from './deleters/message-deleters';
import { deleteOrphanedFocused } from './deleters/activity-deleters';
import { deleteOrphanedNotifs } from './deleters/notif-deleters';
import { deleteExpiredUpdates } from './deleters/update-deleters';
import {
  deleteOrphanedSessions,
  deleteOldWebSessions,
} from './deleters/session-deleters';
import { backupDB } from './backups';

if (cluster.isMaster) {
  schedule.scheduleJob(
    '30 3 * * *',
    async () => {
      try {
        // Do everything one at a time to reduce load since we're in no hurry,
        // and since some queries depend on previous ones.
        await deleteExpiredCookies();
        await deleteExpiredVerifications();
        await deleteInaccessibleThreads();
        await deleteOrphanedMemberships();
        await deleteOrphanedDays();
        await deleteOrphanedEntries();
        await deleteOrphanedRevisions();
        await deleteOrphanedRoles();
        await deleteOrphanedMessages();
        await deleteOrphanedFocused();
        await deleteOrphanedNotifs();
        await deleteExpiredUpdates();
        await deleteOrphanedSessions();
      } catch (e) {
        console.warn(
          "encountered error while trying to clean database",
          e,
        );
      }
    },
  );
  schedule.scheduleJob(
    '0 */4 * * *',
    async () => {
      try {
        await backupDB();
      } catch (e) {
        console.warn(
          "encountered error while trying to backup database",
          e,
        );
      }
    },
  );
}
