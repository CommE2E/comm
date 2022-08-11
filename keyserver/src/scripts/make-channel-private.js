// @flow

import ashoat from 'lib/facts/ashoat';
import { threadTypes } from 'lib/types/thread-types';

import { createScriptViewer } from '../session/scripts';
import { updateThread } from '../updaters/thread-updaters';
import { main } from './utils';

const channelID = '-1';

async function makeChannelPrivate() {
  const viewer = createScriptViewer(ashoat.id);
  await updateThread(viewer, {
    threadID: channelID,
    changes: { type: threadTypes.COMMUNITY_SECRET_SUBTHREAD },
  });
}

main([makeChannelPrivate]);
