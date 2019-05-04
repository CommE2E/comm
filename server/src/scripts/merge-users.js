// @flow

import { type UpdateData, updateTypes } from 'lib/types/update-types';
import type { ServerThreadInfo } from 'lib/types/thread-types';

import { dbQuery, SQL, SQLStatement } from '../database';
import { fetchServerThreadInfos } from '../fetchers/thread-fetchers';
import {
  changeRole,
  commitMembershipChangeset,
} from '../updaters/thread-permission-updaters';
import { createUpdates } from '../creators/update-creator';
import { createScriptViewer } from '../session/scripts';
import { deleteAccount } from '../deleters/account-deleters';
import { endScript } from './utils';

async function main() {
  try {
    await mergeUsers("15972", "7147", { email: true });
    endScript();
  } catch (e) {
    endScript();
    console.warn(e);
  }
}

type ReplaceUserInfo = $Shape<{|
  username: bool,
  email: bool,
  password: bool,
|}>;
async function mergeUsers(
  fromUserID: string,
  toUserID: string,
  replaceUserInfo?: ReplaceUserInfo,
) {
  let updateUserRowQuery = null;
  let updateDatas = [];
  if (replaceUserInfo) {
    const replaceUserResult = await replaceUser(
      fromUserID,
      toUserID,
      replaceUserInfo,
    );
    ({
      sql: updateUserRowQuery,
      updateDatas,
    } = replaceUserResult);
  }

  const usersGettingUpdate = new Set();
  const usersNeedingUpdate = new Set();
  const needUserInfoUpdate = replaceUserInfo && replaceUserInfo.username;
  const setGettingUpdate = (threadInfo: ServerThreadInfo) => {
    if (!needUserInfoUpdate) {
      return;
    }
    for (let { id } of threadInfo.members) {
      usersGettingUpdate.add(id);
      usersNeedingUpdate.delete(id);
    }
  };
  const setNeedingUpdate = (threadInfo: ServerThreadInfo) => {
    if (!needUserInfoUpdate) {
      return;
    }
    for (let { id } of threadInfo.members) {
      if (!usersGettingUpdate.has(id)) {
        usersNeedingUpdate.add(id);
      }
    }
  };

  const newThreadRolePairs = [];
  const { threadInfos } = await fetchServerThreadInfos();
  for (let threadID in threadInfos) {
    const threadInfo = threadInfos[threadID];
    const fromUserExistingMember = threadInfo.members.find(
      memberInfo => memberInfo.id === fromUserID,
    );
    if (!fromUserExistingMember) {
      setNeedingUpdate(threadInfo);
      continue;
    }
    const { role } = fromUserExistingMember;
    if (!role) {
      // Only transfer explicit memberships
      setNeedingUpdate(threadInfo);
      continue;
    }
    const toUserExistingMember = threadInfo.members.find(
      memberInfo => memberInfo.id === toUserID,
    );
    if (!toUserExistingMember || !toUserExistingMember.role) {
      setGettingUpdate(threadInfo);
      newThreadRolePairs.push([ threadID, role ]);
    } else {
      setNeedingUpdate(threadInfo);
    }
  }

  const time = Date.now();
  for (let userID of usersNeedingUpdate) {
    updateDatas.push({
      type: updateTypes.UPDATE_USER,
      userID,
      time,
      updatedUserID: toUserID,
    });
  }
  await createUpdates(updateDatas);

  const changesets = await Promise.all(newThreadRolePairs.map(
    ([ threadID, role ]) => changeRole(threadID, [ toUserID ], role),
  ));
  let changeset = [];
  for (let currentChangeset of changesets) {
    if (!currentChangeset) {
      throw new Error("changeRole returned null");
    }
    changeset = [ ...changeset, ...currentChangeset ];
  }
  if (changeset.length > 0) {
    const toViewer = createScriptViewer(toUserID);
    await commitMembershipChangeset(toViewer, changeset);
  }

  const fromViewer = createScriptViewer(fromUserID);
  await deleteAccount(fromViewer);

  if (updateUserRowQuery) {
    await dbQuery(updateUserRowQuery);
  }
}

type ReplaceUserResult = {|
  sql: ?SQLStatement,
  updateDatas: UpdateData[],
|};
async function replaceUser(
  fromUserID: string,
  toUserID: string,
  replaceUserInfo: ReplaceUserInfo,
): Promise<ReplaceUserResult> {
  if (Object.keys(replaceUserInfo).length === 0) {
    return {
      sql: null,
      updateDatas: [],
    };
  }
  
  const fromUserQuery = SQL`
    SELECT username, hash, email, email_verified
    FROM users
    WHERE id = ${fromUserID}
  `;
  const [ fromUserResult ] = await dbQuery(fromUserQuery);
  const [ firstResult ] = fromUserResult;
  if (!firstResult) {
    throw new Error(`couldn't fetch fromUserID ${fromUserID}`);
  }

  const changedFields = {};
  if (replaceUserInfo.username) {
    changedFields.username = firstResult.username;
  }
  if (replaceUserInfo.email) {
    changedFields.email = firstResult.email;
    changedFields.email_verified = firstResult.email_verified;
  }
  if (replaceUserInfo.password) {
    changedFields.hash = firstResult.hash;
  }

  const updateUserRowQuery = SQL`
    UPDATE users SET ${changedFields} WHERE id = ${toUserID}
  `;

  const updateDatas = [];
  if (replaceUserInfo.username || replaceUserInfo.email) {
    updateDatas.push({
      type: updateTypes.UPDATE_CURRENT_USER,
      userID: toUserID,
      time: Date.now(),
    });
  }
  return {
    sql: updateUserRowQuery,
    updateDatas,
  };
}

main();
