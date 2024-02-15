// @flow

import { threadTypes } from 'lib/types/thread-types-enum.js';

import { main } from './utils.js';
import { createScriptViewer } from '../session/scripts.js';
import { updateThread } from '../updaters/thread-updaters.js';
import { thisKeyserverAdmin } from '../user/identity.js';

const channelID = '-1';

async function makeChannelPrivate() {
  const admin = await thisKeyserverAdmin();
  const viewer = createScriptViewer(admin.id);
  await updateThread(viewer, {
    threadID: channelID,
    changes: { type: threadTypes.COMMUNITY_SECRET_SUBTHREAD },
  });
}

main([makeChannelPrivate]);
