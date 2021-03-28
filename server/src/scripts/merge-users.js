// @flow

import type { Shape } from 'lib/types/core';
import type { ServerThreadInfo } from 'lib/types/thread-types';
import { type UpdateData, updateTypes } from 'lib/types/update-types';

import { createUpdates } from '../creators/update-creator';
import { dbQuery, SQL } from '../database/database';
import type { SQLStatementType } from '../database/types';
import { deleteAccount } from '../deleters/account-deleters';
import { fetchServerThreadInfos } from '../fetchers/thread-fetchers';
import { createScriptViewer } from '../session/scripts';
import {
  changeRole,
  commitMembershipChangeset,
} from '../updaters/thread-permission-updaters';
import RelationshipChangeset from '../utils/relationship-changeset';
import { endScript } from './utils';

async function main() {
  try {
    await mergeUsers('7147', '15972', { username: true, password: true });
    endScript();
  } catch (e) {
    endScript();
    console.warn(e);
  }
}

type ReplaceUserInfo = Shape<{|
  +username: boolean,
  +password: boolean,
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
    ({ sql: updateUserRowQuery, updateDatas } = replaceUserResult);
  }

  const usersGettingUpdate = new Set();
  const usersNeedingUpdate = new Set();
  const needUserInfoUpdate = replaceUserInfo && replaceUserInfo.username;
  const setGettingUpdate = (threadInfo: ServerThreadInfo) => {
    if (!needUserInfoUpdate) {
      return;
    }
    for (const { id } of threadInfo.members) {
      usersGettingUpdate.add(id);
      usersNeedingUpdate.delete(id);
    }
  };
  const setNeedingUpdate = (threadInfo: ServerThreadInfo) => {
    if (!needUserInfoUpdate) {
      return;
    }
    for (const { id } of threadInfo.members) {
      if (!usersGettingUpdate.has(id)) {
        usersNeedingUpdate.add(id);
      }
    }
  };

  const newThreadRolePairs = [];
  const { threadInfos } = await fetchServerThreadInfos();
  for (const threadID in threadInfos) {
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
      newThreadRolePairs.push([threadID, role]);
    } else {
      setNeedingUpdate(threadInfo);
    }
  }

  const fromViewer = createScriptViewer(fromUserID);
  await deleteAccount(fromViewer);

  if (updateUserRowQuery) {
    await dbQuery(updateUserRowQuery);
  }

  const time = Date.now();
  for (const userID of usersNeedingUpdate) {
    updateDatas.push({
      type: updateTypes.UPDATE_USER,
      userID,
      time,
      updatedUserID: toUserID,
    });
  }
  await createUpdates(updateDatas);

  const changesets = await Promise.all(
    newThreadRolePairs.map(([threadID, role]) =>
      changeRole(threadID, [toUserID], role),
    ),
  );
  const membershipRows = [];
  const relationshipChangeset = new RelationshipChangeset();
  for (const currentChangeset of changesets) {
    if (!currentChangeset) {
      throw new Error('changeRole returned null');
    }
    const {
      membershipRows: currentMembershipRows,
      relationshipChangeset: currentRelationshipChangeset,
    } = currentChangeset;
    membershipRows.push(...currentMembershipRows);
    relationshipChangeset.addAll(currentRelationshipChangeset);
  }
  if (membershipRows.length > 0 || relationshipChangeset.getRowCount() > 0) {
    const toViewer = createScriptViewer(toUserID);
    const changeset = { membershipRows, relationshipChangeset };
    await commitMembershipChangeset(toViewer, changeset);
  }
}

type ReplaceUserResult = {|
  sql: ?SQLStatementType,
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
    SELECT username, hash
    FROM users
    WHERE id = ${fromUserID}
  `;
  const [fromUserResult] = await dbQuery(fromUserQuery);
  const [firstResult] = fromUserResult;
  if (!firstResult) {
    throw new Error(`couldn't fetch fromUserID ${fromUserID}`);
  }

  const changedFields = {};
  if (replaceUserInfo.username) {
    changedFields.username = firstResult.username;
  }
  if (replaceUserInfo.password) {
    changedFields.hash = firstResult.hash;
  }

  const updateUserRowQuery = SQL`
    UPDATE users SET ${changedFields} WHERE id = ${toUserID}
  `;

  const updateDatas = [];
  if (replaceUserInfo.username) {
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
