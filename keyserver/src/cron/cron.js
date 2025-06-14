// @flow

import type { Account as OlmAccount } from '@commapp/olm';
import olm from '@commapp/olm';
import cluster from 'cluster';
import schedule from 'node-schedule';

import {
  getOlmMemory,
  compareAndLogOlmMemory,
} from 'lib/utils/olm-memory-utils.js';

import { backupDB } from './backups.js';
import { createDailyUpdatesThread } from './daily-updates.js';
import { postMetrics } from './metrics.js';
import { postLeaderboard } from './phab-leaderboard.js';
import { updateAndReloadGeoipDB } from './update-geoip-db.js';
import { deleteOrphanedActivity } from '../deleters/activity-deleters.js';
import { deleteExpiredCookies } from '../deleters/cookie-deleters.js';
import { deleteOrphanedDays } from '../deleters/day-deleters.js';
import { deleteOrphanedEntries } from '../deleters/entry-deleters.js';
import { deleteOrphanedInviteLinks } from '../deleters/link-deleters.js';
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
import { fetchCallUpdateOlmAccount } from '../updaters/olm-account-updater.js';
import { validateAndUploadAccountPrekeys } from '../utils/olm-utils.js';
import {
  isPrimaryNode,
  isAuxiliaryNode,
} from '../utils/primary-secondary-utils.js';
import { synchronizeInviteLinksWithBlobs } from '../utils/synchronize-invite-links-with-blobs.js';

const { RUN_COMM_TEAM_DEV_SCRIPTS } = process.env;

if (cluster.isMaster) {
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
  if (isPrimaryNode) {
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
          await deleteOrphanedInviteLinks();
        } catch (e) {
          console.warn('encountered error while trying to clean database', e);
        }
      },
    );
    schedule.scheduleJob(
      '0 0 * * *', // every day at midnight in the keyserver's timezone
      async () => {
        const memBefore = getOlmMemory();
        try {
          await fetchCallUpdateOlmAccount(
            'content',
            (contentAccount: OlmAccount) =>
              fetchCallUpdateOlmAccount(
                'notifications',
                (notifAccount: OlmAccount) =>
                  validateAndUploadAccountPrekeys(contentAccount, notifAccount),
              ),
          );
        } catch (e) {
          console.warn('encountered error while trying to validate prekeys', e);
        } finally {
          compareAndLogOlmMemory(memBefore, 'prekey upload cronjob');
        }
      },
    );
    schedule.scheduleJob(
      '0 2 * * *', // every day at 2:00 AM in the keyserver's timezone
      async () => {
        const memBefore = getOlmMemory();
        try {
          await synchronizeInviteLinksWithBlobs();
        } catch (e) {
          console.warn(
            'encountered an error while trying to synchronize invite links with blobs',
            e,
          );
        } finally {
          compareAndLogOlmMemory(memBefore, 'invite links cronjob');
        }
      },
    );
    schedule.scheduleJob(
      '0,15,30,45 * * * *', // every 15 minutes
      async () => {
        const memBefore = getOlmMemory();
        try {
          await olm.init();
        } catch (e) {
          console.warn(
            'encountered an error while executing olm init cron job',
            e,
          );
        } finally {
          compareAndLogOlmMemory(memBefore, 'olm init cronjob');
        }
      },
    );
  }
  if (isPrimaryNode || isAuxiliaryNode) {
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
  }
  if (RUN_COMM_TEAM_DEV_SCRIPTS && (isPrimaryNode || isAuxiliaryNode)) {
    schedule.scheduleJob(
      '0 0 * * *', // every day at midnight in the keyserver's timezone
      async () => {
        try {
          await createDailyUpdatesThread();
        } catch (e) {
          console.warn(
            'encountered error while trying to create daily updates thread',
            e,
          );
        }
      },
    );
    schedule.scheduleJob(
      '0 0 8 * *', // 8th of every month at midnight in the keyserver's timezone
      async () => {
        try {
          await postLeaderboard();
        } catch (e) {
          console.warn(
            'encountered error while trying to post Phabricator leaderboard',
            e,
          );
        }
      },
    );
    schedule.scheduleJob(
      '0 6 * * *', // every day at 6:00 AM in the keyserver's timezone
      async () => {
        try {
          await postMetrics();
        } catch (e) {
          console.warn(
            'encountered error while trying to post product metrics',
            e,
          );
        }
      },
    );
  }
}
