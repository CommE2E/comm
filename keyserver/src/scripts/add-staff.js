// @flow

import bots from 'lib/facts/bots.js';

import { main } from './utils.js';
import { createScriptViewer } from '../session/scripts.js';
import { updateThread } from '../updaters/thread-updaters.js';

const newStaffIDs = ['518252'];

async function addStaff() {
  await updateThread(
    createScriptViewer(bots.commbot.userID),
    {
      threadID: bots.commbot.staffThreadID,
      changes: {
        newMemberIDs: newStaffIDs,
      },
    },
    {
      forceAddMembers: true,
    },
  );
}

main([addStaff]);
