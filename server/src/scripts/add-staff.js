// @flow

import bots from 'lib/facts/bots';

import { createScriptViewer } from '../session/scripts';
import { updateThread } from '../updaters/thread-updaters';
import { main } from './utils';

const newStaffIDs = ['518252'];

async function addStaff() {
  await updateThread(createScriptViewer(bots.squadbot.userID), {
    threadID: bots.squadbot.staffThreadID,
    changes: {
      newMemberIDs: newStaffIDs,
    },
  });
}

main([addStaff]);
