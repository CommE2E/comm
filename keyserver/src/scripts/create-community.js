// @flow

import { threadTypes } from 'lib/types/thread-types-enum.js';

import { main } from './utils.js';
import { createThread } from '../creators/thread-creator.js';
import { createScriptViewer } from '../session/scripts.js';
import { thisKeyserverAdmin } from '../user/identity.js';

const communityName = 'New community';

async function createCommunity() {
  const admin = await thisKeyserverAdmin();
  const adminViewer = createScriptViewer(admin.id);
  await createThread(adminViewer, {
    type: threadTypes.COMMUNITY_ROOT,
    name: communityName,
  });
}

main([createCommunity]);
