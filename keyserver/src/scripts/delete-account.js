// @flow

import { main } from './utils.js';
import { deleteAccount } from '../deleters/account-deleters.js';
import { createScriptViewer } from '../session/scripts.js';
import { privilegedDeleteUsers } from '../utils/identity-utils.js';

async function deleteTargetAccount() {
  const targetUserID = '';
  await privilegedDeleteUsers([targetUserID]);
  const viewer = createScriptViewer(targetUserID);
  await deleteAccount(viewer);
}

main([deleteTargetAccount]);
