// @flow

import invariant from 'invariant';

import ashoat from 'lib/facts/ashoat.js';
import bots from 'lib/facts/bots.js';
import genesis from 'lib/facts/genesis.js';
import testers from 'lib/facts/testers.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import { threadTypes, type ThreadType } from 'lib/types/thread-types.js';

import { main } from './utils.js';
import createMessages from '../creators/message-creator.js';
import { createThread } from '../creators/thread-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import { fetchServerThreadInfos } from '../fetchers/thread-fetchers.js';
import { fetchAllUserIDs } from '../fetchers/user-fetchers.js';
import { createScriptViewer } from '../session/scripts.js';
import type { Viewer } from '../session/viewer.js';
import {
  recalculateThreadPermissions,
  commitMembershipChangeset,
  saveMemberships,
} from '../updaters/thread-permission-updaters.js';
import { updateThread } from '../updaters/thread-updaters.js';

const batchSize = 10;
const createThreadOptions = { forceAddMembers: true };
const updateThreadOptions = {
  forceUpdateRoot: true,
  silenceMessages: true,
  ignorePermissions: true,
};
const convertUnadminnedToCommunities = ['311733', '421638'];
const convertToAnnouncementCommunities = ['375310'];
const convertToAnnouncementSubthreads = ['82649'];
const threadsWithMissingParent = ['534395'];
const personalThreadsWithMissingMembers = [
  '82161',
  '103111',
  '210609',
  '227049',
];
const excludeFromTestersThread = new Set([
  '1402',
  '39227',
  '156159',
  '526973',
  '740732',
]);

async function createGenesisCommunity() {
  const genesisThreadInfos = await fetchServerThreadInfos(
    SQL`t.id = ${genesis.id}`,
  );
  const genesisThreadInfo = genesisThreadInfos.threadInfos[genesis.id];
  if (genesisThreadInfo && genesisThreadInfo.type === threadTypes.GENESIS) {
    return;
  } else if (genesisThreadInfo) {
    return await updateGenesisCommunityType();
  }

  console.log('creating GENESIS community');

  const idInsertQuery = SQL`
    INSERT INTO ids(id, table_name)
    VALUES ${[[genesis.id, 'threads']]}
  `;
  await dbQuery(idInsertQuery);

  const ashoatViewer = createScriptViewer(ashoat.id);
  const allUserIDs = await fetchAllUserIDs();
  const nonAshoatUserIDs = allUserIDs.filter(id => id !== ashoat.id);

  await createThread(
    ashoatViewer,
    {
      id: genesis.id,
      type: threadTypes.GENESIS,
      name: genesis.name,
      description: genesis.description,
      initialMemberIDs: nonAshoatUserIDs,
    },
    createThreadOptions,
  );

  await createMessages(
    ashoatViewer,
    genesis.introMessages.map(message => ({
      type: messageTypes.TEXT,
      threadID: genesis.id,
      creatorID: ashoat.id,
      time: Date.now(),
      text: message,
    })),
  );

  console.log('creating testers thread');

  const testerUserIDs = nonAshoatUserIDs.filter(
    userID => !excludeFromTestersThread.has(userID),
  );
  const { newThreadID } = await createThread(
    ashoatViewer,
    {
      type: threadTypes.COMMUNITY_SECRET_SUBTHREAD,
      name: testers.name,
      description: testers.description,
      initialMemberIDs: testerUserIDs,
    },
    createThreadOptions,
  );
  invariant(
    newThreadID,
    'newThreadID for tester thread creation should be set',
  );

  await createMessages(
    ashoatViewer,
    testers.introMessages.map(message => ({
      type: messageTypes.TEXT,
      threadID: newThreadID,
      creatorID: ashoat.id,
      time: Date.now(),
      text: message,
    })),
  );
}

async function updateGenesisCommunityType() {
  console.log('updating GENESIS community to GENESIS type');

  const ashoatViewer = createScriptViewer(ashoat.id);
  await updateThread(
    ashoatViewer,
    {
      threadID: genesis.id,
      changes: {
        type: threadTypes.GENESIS,
      },
    },
    updateThreadOptions,
  );
}

async function convertExistingCommunities() {
  const communityQuery = SQL`
    SELECT t.id, t.name
    FROM threads t
    LEFT JOIN roles r ON r.thread = t.id
    LEFT JOIN memberships m ON m.thread = t.id
    WHERE t.type = ${threadTypes.COMMUNITY_SECRET_SUBTHREAD}
      AND t.parent_thread_id IS NULL
    GROUP BY t.id
    HAVING COUNT(DISTINCT r.id) > 1 AND COUNT(DISTINCT m.user) > 2
  `;
  const [convertToCommunity] = await dbQuery(communityQuery);

  const botViewer = createScriptViewer(bots.commbot.userID);
  await convertThreads(
    botViewer,
    convertToCommunity,
    threadTypes.COMMUNITY_ROOT,
  );
}

async function convertThreads(
  viewer: Viewer,
  threads: Array<{ +id: number, +name: string }>,
  type: ThreadType,
) {
  while (threads.length > 0) {
    const batch = threads.splice(0, batchSize);
    await Promise.all(
      batch.map(async thread => {
        console.log(`converting ${JSON.stringify(thread)} to ${type}`);
        return await updateThread(
          viewer,
          {
            threadID: thread.id.toString(),
            changes: { type },
          },
          updateThreadOptions,
        );
      }),
    );
  }
}

async function convertUnadminnedCommunities() {
  const communityQuery = SQL`
    SELECT id, name
    FROM threads
    WHERE id IN (${convertUnadminnedToCommunities}) AND
      type = ${threadTypes.COMMUNITY_SECRET_SUBTHREAD}
  `;
  const [convertToCommunity] = await dbQuery(communityQuery);

  // We use ashoat here to make sure he becomes the admin of these communities
  const ashoatViewer = createScriptViewer(ashoat.id);
  await convertThreads(
    ashoatViewer,
    convertToCommunity,
    threadTypes.COMMUNITY_ROOT,
  );
}

async function convertAnnouncementCommunities() {
  const announcementCommunityQuery = SQL`
    SELECT id, name
    FROM threads
    WHERE id IN (${convertToAnnouncementCommunities}) AND
      type != ${threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT}
  `;
  const [convertToAnnouncementCommunity] = await dbQuery(
    announcementCommunityQuery,
  );

  const botViewer = createScriptViewer(bots.commbot.userID);
  await convertThreads(
    botViewer,
    convertToAnnouncementCommunity,
    threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT,
  );
}

async function convertAnnouncementSubthreads() {
  const announcementSubthreadQuery = SQL`
    SELECT id, name
    FROM threads
    WHERE id IN (${convertToAnnouncementSubthreads}) AND
      type != ${threadTypes.COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD}
  `;
  const [convertToAnnouncementSubthread] = await dbQuery(
    announcementSubthreadQuery,
  );

  const botViewer = createScriptViewer(bots.commbot.userID);
  await convertThreads(
    botViewer,
    convertToAnnouncementSubthread,
    threadTypes.COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD,
  );
}

async function fixThreadsWithMissingParent() {
  const threadsWithMissingParentQuery = SQL`
    SELECT id, name
    FROM threads
    WHERE id IN (${threadsWithMissingParent}) AND
      type != ${threadTypes.COMMUNITY_SECRET_SUBTHREAD}
  `;
  const [threadsWithMissingParentResult] = await dbQuery(
    threadsWithMissingParentQuery,
  );

  const botViewer = createScriptViewer(bots.commbot.userID);
  while (threadsWithMissingParentResult.length > 0) {
    const batch = threadsWithMissingParentResult.splice(0, batchSize);
    await Promise.all(
      batch.map(async thread => {
        console.log(`fixing ${JSON.stringify(thread)} with missing parent`);
        return await updateThread(
          botViewer,
          {
            threadID: thread.id.toString(),
            changes: {
              parentThreadID: null,
              type: threadTypes.COMMUNITY_SECRET_SUBTHREAD,
            },
          },
          updateThreadOptions,
        );
      }),
    );
  }
}

async function fixPersonalThreadsWithMissingMembers() {
  const missingMembersQuery = SQL`
    SELECT thread, user
    FROM memberships
    WHERE thread IN (${personalThreadsWithMissingMembers}) AND role <= 0
  `;
  const [missingMembers] = await dbQuery(missingMembersQuery);

  const botViewer = createScriptViewer(bots.commbot.userID);
  for (const row of missingMembers) {
    console.log(`fixing ${JSON.stringify(row)} with missing member`);
    await updateThread(
      botViewer,
      {
        threadID: row.thread.toString(),
        changes: {
          newMemberIDs: [row.user.toString()],
        },
      },
      updateThreadOptions,
    );
  }
}

async function moveThreadsToGenesis() {
  const noParentQuery = SQL`
    SELECT id, name
    FROM threads
    WHERE type != ${threadTypes.COMMUNITY_ROOT}
      AND type != ${threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT}
      AND type != ${threadTypes.GENESIS}
      AND parent_thread_id IS NULL
  `;
  const [noParentThreads] = await dbQuery(noParentQuery);

  const botViewer = createScriptViewer(bots.commbot.userID);
  while (noParentThreads.length > 0) {
    const batch = noParentThreads.splice(0, batchSize);
    await Promise.all(
      batch.map(async thread => {
        console.log(`processing ${JSON.stringify(thread)}`);
        return await updateThread(
          botViewer,
          {
            threadID: thread.id.toString(),
            changes: {
              parentThreadID: genesis.id,
            },
          },
          updateThreadOptions,
        );
      }),
    );
  }

  const childQuery = SQL`
    SELECT id, name
    FROM threads
    WHERE type != ${threadTypes.COMMUNITY_ROOT}
      AND type != ${threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT}
      AND type != ${threadTypes.GENESIS}
      AND parent_thread_id IS NOT NULL
      AND parent_thread_id != ${genesis.id}
  `;
  const [childThreads] = await dbQuery(childQuery);

  for (const childThread of childThreads) {
    // We go one by one because the changes in a parent thread can affect a
    // child thread. If the child thread update starts at the same time as an
    // update for its parent thread, a race can cause incorrect results for the
    // child thread (in particular for the permissions on the memberships table)
    console.log(`processing ${JSON.stringify(childThread)}`);
    await updateThread(
      botViewer,
      {
        threadID: childThread.id.toString(),
        changes: {},
      },
      updateThreadOptions,
    );
  }
}

async function clearMembershipPermissions() {
  const membershipPermissionQuery = SQL`
    SELECT DISTINCT thread
    FROM memberships
    WHERE JSON_EXTRACT(permissions, '$.membership') IS NOT NULL
  `;
  const [membershipPermissionResult] = await dbQuery(membershipPermissionQuery);
  if (membershipPermissionResult.length === 0) {
    return;
  }

  const botViewer = createScriptViewer(bots.commbot.userID);
  for (const row of membershipPermissionResult) {
    const threadID = row.thread.toString();
    console.log(`clearing membership permissions for ${threadID}`);
    const changeset = await recalculateThreadPermissions(threadID);
    await commitMembershipChangeset(botViewer, changeset);
  }

  console.log('clearing -1 rows...');
  const emptyMembershipDeletionQuery = SQL`
    DELETE FROM memberships
    WHERE role = -1 AND permissions IS NULL
  `;
  await dbQuery(emptyMembershipDeletionQuery);

  await createMembershipsForFormerMembers();
}

async function createMembershipsForFormerMembers() {
  const [result] = await dbQuery(SQL`
    SELECT DISTINCT thread, user
    FROM messages m
    WHERE NOT EXISTS (
      SELECT thread, user FROM memberships mm
      WHERE m.thread = mm.thread AND m.user = mm.user
    )
  `);

  const rowsToSave = [];
  for (const row of result) {
    rowsToSave.push({
      operation: 'save',
      userID: row.user.toString(),
      threadID: row.thread.toString(),
      userNeedsFullThreadDetails: false,
      intent: 'none',
      permissions: null,
      permissionsForChildren: null,
      role: '-1',
      oldRole: '-1',
    });
  }

  await saveMemberships(rowsToSave);
}

main([
  createGenesisCommunity,
  convertExistingCommunities,
  convertUnadminnedCommunities,
  convertAnnouncementCommunities,
  convertAnnouncementSubthreads,
  fixThreadsWithMissingParent,
  fixPersonalThreadsWithMissingMembers,
  moveThreadsToGenesis,
  clearMembershipPermissions,
]);
