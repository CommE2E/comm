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
  if (genesisThreadInfo) {
    return;
  }

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
      type: threadTypes.COMMUNITY_ROOT,
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
  const nonCommunityQuery = SQL`
    SELECT id, name, parent_thread_id
    FROM threads
    WHERE type != ${threadTypes.COMMUNITY_ROOT}
  `;
  const [threads] = await dbQuery(nonCommunityQuery);

  const botViewer = createScriptViewer(bots.squadbot.userID);
  for (const thread of threads) {
    // We go one by one because the changes in a parent thread can affect a
    // child thread. If the child thread update starts at the same time as an
    // update for its parent thread, a race can cause incorrect results for the
    // child thread (in particular for the permissions on the memberships table)
    console.log(`processing ${JSON.stringify(thread)}`);
    await updateThread(
      botViewer,
      {
        threadID: thread.id,
        changes: {
          parentThreadID: thread.parent_thread_id ? undefined : genesis.id,
        },
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
