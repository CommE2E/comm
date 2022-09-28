// @flow

import bots from 'lib/facts/bots';
import { threadTypes, assertThreadType } from 'lib/types/thread-types';

import { dbQuery, SQL } from '../database/database';
import { createScriptViewer } from '../session/scripts';
import { updateThread } from '../updaters/thread-updaters';
import { main } from './utils';

const batchSize = 10;
const updateThreadOptions = { forceUpdateRoot: true };
const threadObjectComparator = (a, b) => a.id - b.id;

// When we introduced threadTypes.PERSONAL and threadTypes.PRIVATE, we made some
// mistakes in how we converted existing threads into the new thread types:
// (1) For both PRIVATE and PERSONAL, we didn't handle converting threads that
//     had multiple roles properly. updateRoles was written to handle this, but
//     we missed it and wrote some code that just converted all roles to the new
//     role type instead of deleting extra roles and migrating those members
//     over to the new single role.
// (2) We allowed multiple threads per user to be converted into PRIVATE
//     threads.
// (3) We allowed threads with a parent to be converted into PRIVATE threads.
// (4) We forgot to include EDIT_ENTRIES permissions for PRIVATE threads.
async function fixNewThreadTypes() {
  const fetchBrokenThreads = SQL`
    SELECT t.id, t.type, t.parent_thread_id, MIN(m.user) AS user
    FROM threads t
    LEFT JOIN memberships m ON m.thread = t.id
    WHERE t.type IN (${[threadTypes.PERSONAL, threadTypes.PRIVATE]})
    GROUP BY t.id
  `;
  const [result] = await dbQuery(fetchBrokenThreads);

  const forceUpdatePersonalThreadIDs = new Set();
  const privateThreadsByUser = new Map();
  for (const row of result) {
    const id = row.id.toString();
    const threadType = assertThreadType(row.type);
    if (threadType === threadTypes.PERSONAL) {
      forceUpdatePersonalThreadIDs.add(id);
      continue;
    }
    const user = row.user.toString();
    const parentThreadID = row.parent_thread_id
      ? row.parent_thread_id.toString()
      : null;
    let userPrivateThreads = privateThreadsByUser.get(user);
    if (!userPrivateThreads) {
      userPrivateThreads = new Set();
      privateThreadsByUser.set(user, userPrivateThreads);
    }
    userPrivateThreads.add({ id, parentThreadID });
  }

  const forceUpdatePrivateThreadIDs = new Set();
  const unsetPrivateThreads = new Set();
  for (const userPrivateThreads of privateThreadsByUser.values()) {
    const sortedPrivateThreads = [...userPrivateThreads].sort(
      threadObjectComparator,
    );
    while (sortedPrivateThreads.length > 0) {
      const privateThread = sortedPrivateThreads.shift();
      if (!privateThread.parentThreadID) {
        forceUpdatePrivateThreadIDs.add(privateThread.id);
        break;
      }
      unsetPrivateThreads.add(privateThread.id);
    }
    for (const privateThread of sortedPrivateThreads) {
      unsetPrivateThreads.add(privateThread.id);
    }
  }

  const updateThreadRequests = [];
  for (const threadID of forceUpdatePersonalThreadIDs) {
    updateThreadRequests.push({
      threadID,
      changes: {
        type: threadTypes.PERSONAL,
      },
    });
  }
  for (const threadID of forceUpdatePrivateThreadIDs) {
    updateThreadRequests.push({
      threadID,
      changes: {
        type: threadTypes.PRIVATE,
      },
    });
  }
  for (const threadID of unsetPrivateThreads) {
    updateThreadRequests.push({
      threadID,
      changes: {
        type: threadTypes.COMMUNITY_SECRET_SUBTHREAD,
        description: '',
      },
    });
  }

  const viewer = createScriptViewer(bots.commbot.userID);
  while (updateThreadRequests.length > 0) {
    const batch = updateThreadRequests.splice(0, batchSize);
    await Promise.all(
      batch.map(async updateThreadRequest => {
        console.log(`updating ${JSON.stringify(updateThreadRequest)}`);
        return await updateThread(
          viewer,
          updateThreadRequest,
          updateThreadOptions,
        );
      }),
    );
  }
}

main([fixNewThreadTypes]);
