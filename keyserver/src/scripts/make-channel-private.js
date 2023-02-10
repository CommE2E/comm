// @flow

import ashoat from 'lib/facts/ashoat.js';
import { threadTypes } from 'lib/types/thread-types.js';

import { main } from './utils.js';
import { createScriptViewer } from '../session/scripts.js';
import { updateThread } from '../updaters/thread-updaters.js';

const channelID = '-1';

async function makeChannelPrivate() {
  const viewer = createScriptViewer(ashoat.id);
  await updateThread(viewer, {
    threadID: channelID,
    changes: { type: threadTypes.COMMUNITY_SECRET_SUBTHREAD },
  });
}

main([makeChannelPrivate]);
