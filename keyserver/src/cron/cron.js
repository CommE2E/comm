// @flow

import cluster from 'cluster';
import schedule from 'node-schedule';

import { deleteOrphanedActivity } from '../deleters/activity-deleters';
import { deleteExpiredCookies } from '../deleters/cookie-deleters';
import { deleteOrphanedDays } from '../deleters/day-deleters';
import { deleteOrphanedEntries } from '../deleters/entry-deleters';
import { deleteOrphanedMemberships } from '../deleters/membership-deleters';
import { deleteOrphanedMessages } from '../deleters/message-deleters';
import { deleteOrphanedNotifs } from '../deleters/notif-deleters';
import { deleteOrphanedRevisions } from '../deleters/revision-deleters';
import { deleteOrphanedRoles } from '../deleters/role-deleters';
import {
  deleteOrphanedSessions,
  deleteOldWebSessions,
} from '../deleters/session-deleters';
import { deleteStaleSIWENonceEntries } from '../deleters/siwe-nonce-deleters.js';
import { deleteInaccessibleThreads } from '../deleters/thread-deleters';
import { deleteExpiredUpdates } from '../deleters/update-deleters';
import { deleteUnassignedUploads } from '../deleters/upload-deleters';
import { backupDB } from './backups';
import { updateAndReloadGeoipDB } from './update-geoip-db';

if (cluster.isMaster) {
  schedule.scheduleJob(
    '30 3 * * *', // every day at 3:30 AM Pacific Time
    async () => {
      try {
        // Do everything one at a time to reduce load since we're in no hurry,
        // and since some queries depend on previous ones.
        await deleteExpiredCookies();
        await deleteInaccessibleThreads();
        await deleteOrphanedMemberships();
        await deleteOrphanedDays();
        await deleteOrphanedEntries();
        await deleteOrphanedRevisions();
        await deleteOrphanedRoles();
        await deleteOrphanedMessages();
        await deleteOrphanedActivity();
        await deleteOrphanedNotifs();
        await deleteOrphanedSessions();
        await deleteOldWebSessions();
        await deleteExpiredUpdates();
        await deleteUnassignedUploads();
        await deleteStaleSIWENonceEntries();
      } catch (e) {
        console.warn('encountered error while trying to clean database', e);
      }
    },
  );
  schedule.scheduleJob(
    '0 */4 * * *', // every four hours
    async () => {
      try {
        await backupDB();
      } catch (e) {
        console.warn('encountered error while trying to backup database', e);
      }
    },
  );
  schedule.scheduleJob(
    '0 3 ? * 0', // every Sunday at 3:00 AM Pacific Time
    async () => {
      try {
        await updateAndReloadGeoipDB();
      } catch (e) {
        console.warn(
          'encountered error while trying to update GeoIP database',
          e,
        );
      }
    },
  );
}
