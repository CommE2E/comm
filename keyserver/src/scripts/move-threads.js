// @flow

import { threadTypes } from 'lib/types/thread-types-enum.js';

import { main } from './utils.js';
import { createScriptViewer } from '../session/scripts.js';
import { updateThread } from '../updaters/thread-updaters.js';
import { thisKeyserverAdmin } from '../user/identity.js';

async function moveThreads() {
  const admin = await thisKeyserverAdmin();
  const viewer = createScriptViewer(admin.id);
  await updateThread(
    viewer,
    {
      threadID: '1251682', // comm global hq
      changes: {
        type: threadTypes.COMMUNITY_SECRET_SUBTHREAD,
        parentThreadID: '311733', // Comm
      },
    },
    { ignorePermissions: true },
  );
  await updateThread(
    viewer,
    {
      threadID: '1512796', // Bird App
      changes: {
        type: threadTypes.COMMUNITY_OPEN_SUBTHREAD,
        parentThreadID: '311733', // Comm
      },
    },
    { ignorePermissions: true },
  );
}

main([moveThreads]);
