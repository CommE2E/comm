// @flow

import { messageSpecs } from 'lib/shared/messages/message-specs';
import { messageTypes } from 'lib/types/message-types';
import { updateTypes } from 'lib/types/update-types';

import { createUpdates } from '../creators/update-creator';
import { dbQuery, mergeOrConditions, SQL } from '../database/database';
import { main } from './utils';

async function determineSenderStatus() {
  const includedMessageTypes = Object.keys(messageTypes)
    .map((key) => messageTypes[key])
    .filter((type) => messageSpecs[type].includedInRepliesCount);

  const sendersQuery = SQL`
    SELECT DISTINCT m.thread AS threadID, m.user AS userID
    FROM messages m 
    WHERE m.type IN (${includedMessageTypes})  
  `;
  const [senders] = await dbQuery(sendersQuery);

  const conditions = senders.map(
    ({ threadID, userID }) => SQL`thread = ${threadID} AND user = ${userID}`,
  );
  const setSenders = SQL`
    UPDATE memberships m
    SET m.sender = 1
    WHERE 
  `;
  setSenders.append(mergeOrConditions(conditions));

  const updatedThreads = new Set(senders.map(({ threadID }) => threadID));
  const affectedMembersQuery = SQL`
    SELECT thread AS threadID, user AS userID
    FROM memberships
    WHERE thread IN (${[...updatedThreads]})
      AND role >= 0
  `;

  const [[affectedMembers]] = await Promise.all([
    dbQuery(affectedMembersQuery),
    dbQuery(setSenders),
  ]);

  const time = Date.now();
  const updates = affectedMembers.map(({ threadID, userID }) => ({
    userID,
    time,
    threadID,
    type: updateTypes.UPDATE_THREAD,
  }));
  await createUpdates(updates);
}

main([determineSenderStatus]);
