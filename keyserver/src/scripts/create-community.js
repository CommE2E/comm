// @flow

import { threadTypes } from 'lib/types/thread-types-enum.js';

import { main } from './utils.js';
import { createThread } from '../creators/thread-creator.js';
import { createScriptViewer } from '../session/scripts.js';
import { thisKeyserverAdmin } from '../user/identity.js';

const communityName = 'New community';

async function createCommunity() {
  const admin = await thisKeyserverAdmin();
  const ashoatViewer = createScriptViewer(admin.id);
  await createThread(ashoatViewer, {
    type: threadTypes.COMMUNITY_ROOT,
    name: communityName,
  });
}

main([createCommunity]);
