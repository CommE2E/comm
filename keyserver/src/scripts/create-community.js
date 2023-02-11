// @flow

import ashoat from 'lib/facts/ashoat.js';
import { threadTypes } from 'lib/types/thread-types.js';

import { main } from './utils.js';
import { createThread } from '../creators/thread-creator.js';
import { createScriptViewer } from '../session/scripts.js';

const communityName = 'New community';

async function createCommunity() {
  const ashoatViewer = createScriptViewer(ashoat.id);
  await createThread(ashoatViewer, {
    type: threadTypes.COMMUNITY_ROOT,
    name: communityName,
  });
}

main([createCommunity]);
