// @flow

import cluster from 'cluster';
import schedule from 'node-schedule';

import { backupDB } from './backups.js';
import { createDailyUpdatesThread } from './daily-updates.js';
import { updateAndReloadGeoipDB } from './update-geoip-db.js';
import { deleteOrphanedActivity } from '../deleters/activity-deleters.js';
import { deleteExpiredCookies } from '../deleters/cookie-deleters.js';
import { deleteOrphanedDays } from '../deleters/day-deleters.js';
import { deleteOrphanedEntries } from '../deleters/entry-deleters.js';
import { deleteOrphanedMemberships } from '../deleters/membership-deleters.js';
import { deleteOrphanedMessages } from '../deleters/message-deleters.js';
import { deleteOrphanedNotifs } from '../deleters/notif-deleters.js';
import { deleteOrphanedRevisions } from '../deleters/revision-deleters.js';
import { deleteOrphanedRoles } from '../deleters/role-deleters.js';
import {
  deleteOrphanedSessions,
  deleteOldWebSessions,
} from '../deleters/session-deleters.js';
import { deleteStaleSIWENonceEntries } from '../deleters/siwe-nonce-deleters.js';
import { deleteInaccessibleThreads } from '../deleters/thread-deleters.js';
import { deleteExpiredUpdates } from '../deleters/update-deleters.js';
import { deleteUnassignedUploads } from '../deleters/upload-deleters.js';
import { fetchKeyserverOlmAccount } from '../fetchers/olm-account-fetcher.js';
import { updateOlmAccount } from '../updaters/olm-account-updater.js';
import { validateAccountPrekey } from '../utils/olm-utils.js';

if (cluster.isMaster) {
  schedule.scheduleJob(
    '30 3 * * *', // every day at 3:30 AM in the keyserver's timezone
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
    '0 3 ? * 0', // every Sunday at 3:00 AM in the keyserver's timezone
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
  schedule.scheduleJob(
    '0 0 * * *', // every day at midnight in the keyserver's timezone
    async () => {
      try {
        if (process.env.RUN_COMM_TEAM_DEV_SCRIPTS) {
          // This is a job that the Comm internal team uses
          await createDailyUpdatesThread();
        }
      } catch (e) {
        console.warn(
          'encountered error while trying to create daily updates thread',
          e,
        );
      }
    },
  );

  schedule.scheduleJob(
    '0 0 * * *', // every day at midnight in the keyserver's timezone
    async () => {
      try {
        const [
          { picklingKey: primaryPicklingKey, account: primaryAccount },
          {
            picklingKey: notificationsPicklingKey,
            account: notificationsAccount,
          },
        ] = await Promise.all([
          fetchKeyserverOlmAccount(true),
          fetchKeyserverOlmAccount(false),
        ]);

        await Promise.all([
          validateAccountPrekey(primaryAccount),
          validateAccountPrekey(notificationsAccount),
        ]);

        await Promise.all([
          updateOlmAccount(primaryAccount, primaryPicklingKey, true),
          updateOlmAccount(
            notificationsAccount,
            notificationsPicklingKey,
            false,
          ),
        ]);
      } catch (e) {
        console.warn('encountered error while trying to validate prekeys', e);
      }
    },
  );
}
