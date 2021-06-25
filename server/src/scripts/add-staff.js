// @flow

import bots from 'lib/facts/bots';

import { createScriptViewer } from '../session/scripts';
import { updateThread } from '../updaters/thread-updaters';
import { main } from './utils';

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
