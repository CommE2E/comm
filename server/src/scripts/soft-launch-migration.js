// @flow

import ashoat from 'lib/facts/ashoat';
import bots from 'lib/facts/bots';
import genesis from 'lib/facts/genesis';
import { threadTypes } from 'lib/types/thread-types';

import { createThread } from '../creators/thread-creator';
import { dbQuery, SQL } from '../database/database';
import { fetchServerThreadInfos } from '../fetchers/thread-fetchers';
import { fetchAllUserIDs } from '../fetchers/user-fetchers';
import { createScriptViewer } from '../session/scripts';
import type { Viewer } from '../session/viewer';
import { updateThread } from '../updaters/thread-updaters';
import { main } from './utils';

const batchSize = 10;
const createThreadOptions = { forceAddMembers: true };
const updateThreadOptions = {
  forceUpdateRoot: true,
  silenceMessages: true,
  ignorePermissions: true,
};
const convertUnadminnedCommunities = ['311733', '421638'];

async function createGenesisCommunity() {
  const genesisThreadInfos = await fetchServerThreadInfos(
    SQL`t.id = ${genesis.id}`,
  );
  const genesisThreadInfo = genesisThreadInfos.threadInfos[genesis.id];
  if (
    genesisThreadInfo &&
    genesisThreadInfo.type === threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT
  ) {
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
  const nonAshoatUserIDs = allUserIDs.filter((id) => id !== ashoat.id);

  await createThread(
    ashoatViewer,
    {
      id: genesis.id,
      type: threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT,
      name: 'GENESIS',
      description:
        'This is the first community on Comm. In the future it will be ' +
        'possible to create threads outside of a community, but for now all ' +
        'of these threads get set with GENESIS as their parent. GENESIS is ' +
        "hosted on Ashoat's keyserver.",
      initialMemberIDs: nonAshoatUserIDs,
    },
    createThreadOptions,
  );
}

async function updateGenesisCommunityType() {
  console.log('updating GENESIS community to COMMUNITY_ANNOUNCEMENT_ROOT');

  const ashoatViewer = createScriptViewer(ashoat.id);
  await updateThread(
    ashoatViewer,
    {
      threadID: genesis.id,
      changes: {
        type: threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT,
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

  const botViewer = createScriptViewer(bots.squadbot.userID);
  await convertCommunities(botViewer, convertToCommunity);
}

async function convertCommunities(
  viewer: Viewer,
  threads: Array<{| +id: string, +name: string |}>,
) {
  while (threads.length > 0) {
    const batch = threads.splice(0, batchSize);
    await Promise.all(
      batch.map(async (thread) => {
        console.log(`converting ${JSON.stringify(thread)} to COMMUNITY_ROOT`);
        return await updateThread(
          viewer,
          {
            threadID: thread.id,
            changes: { type: threadTypes.COMMUNITY_ROOT },
          },
          updateThreadOptions,
        );
      }),
    );
  }
}

async function convertCertainUnadminnedCommunities() {
  const communityQuery = SQL`
    SELECT id, name
    FROM threads
    WHERE id IN (${convertUnadminnedCommunities}) AND 
      type = ${threadTypes.COMMUNITY_SECRET_SUBTHREAD}
  `;
  const [convertToCommunity] = await dbQuery(communityQuery);

  // We use ashoat here to make sure he becomes the admin of these communities
  const ashoatViewer = createScriptViewer(ashoat.id);
  await convertCommunities(ashoatViewer, convertToCommunity);
}

async function moveThreadsToGenesis() {
  const noParentQuery = SQL`
    SELECT id, name
    FROM threads
    WHERE type != ${threadTypes.COMMUNITY_ROOT}
      AND type != ${threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT}
      AND parent_thread_id IS NULL
  `;
  const [noParentThreads] = await dbQuery(noParentQuery);

  const botViewer = createScriptViewer(bots.squadbot.userID);
  while (noParentThreads.length > 0) {
    const batch = noParentThreads.splice(0, batchSize);
    await Promise.all(
      batch.map(async (thread) => {
        console.log(`processing ${JSON.stringify(thread)}`);
        return await updateThread(
          botViewer,
          {
            threadID: thread.id,
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
        threadID: childThread.id,
        changes: {},
      },
      updateThreadOptions,
    );
  }
}

main([
  createGenesisCommunity,
  convertExistingCommunities,
  convertCertainUnadminnedCommunities,
  moveThreadsToGenesis,
]);
