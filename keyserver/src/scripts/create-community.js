// @flow

import ashoat from 'lib/facts/ashoat';
import { threadTypes } from 'lib/types/thread-types';

import { createThread } from '../creators/thread-creator';
import { createScriptViewer } from '../session/scripts';
import { main } from './utils';

const communityName = 'New community';

async function createCommunity() {
  const ashoatViewer = createScriptViewer(ashoat.id);
  await createThread(ashoatViewer, {
    type: threadTypes.COMMUNITY_ROOT,
    name: communityName,
  });
}

main([createCommunity]);
