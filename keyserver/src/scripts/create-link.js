// @flow

import bots from 'lib/facts/bots.js';

import { main } from './utils.js';
import { createOrUpdatePublicLink } from '../creators/invite-link-creator.js';
import { createScriptViewer } from '../session/scripts.js';

async function addLink() {
  const viewer = createScriptViewer(bots.commbot.userID);
  await createOrUpdatePublicLink(viewer, {
    name: '',
    communityID: '',
    threadID: '',
  });
}

main([addLink]);
