// @flow

import invariant from 'invariant';

import bots from 'lib/facts/bots.js';
import { threadTypes } from 'lib/types/thread-types.js';

import { createThread } from '../creators/thread-creator.js';
import { createBotViewer } from '../session/bots.js';

const { commbot } = bots;

async function createCommbotThread(userID: string): Promise<string> {
  const commbotViewer = createBotViewer(commbot.userID);
  const newThreadRequest = {
    type: threadTypes.PERSONAL,
    initialMemberIDs: [userID],
  };
  const result = await createThread(commbotViewer, newThreadRequest, {
    forceAddMembers: true,
  });
  const { newThreadID } = result;
  invariant(
    newThreadID,
    'createThread should return newThreadID to bot viewer',
  );
  return newThreadID;
}

export { createCommbotThread };
