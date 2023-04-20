// @flow

import { messageSpecs } from 'lib/shared/messages/message-specs.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import { updateTypes } from 'lib/types/update-types.js';

import { main } from './utils.js';
import { createUpdates } from '../creators/update-creator.js';
import { dbQuery, mergeOrConditions, SQL } from '../database/database.js';

async function addRepliesCountColumn() {
  const update = SQL`
    ALTER TABLE threads
    ADD replies_count INT UNSIGNED NOT NULL DEFAULT 0
  `;

  try {
    await dbQuery(update);
  } catch (e) {
    console.log(e, 'replies-count column already exists');
  }
}

async function addSenderColumn() {
  const update = SQL`
    ALTER TABLE memberships
    ADD sender TINYINT(1) UNSIGNED NOT NULL DEFAULT 0
  `;

  try {
    await dbQuery(update);
  } catch (e) {
    console.log(e, 'sender column already exists');
  }
}

async function computeRepliesCount() {
  const includedMessageTypes = Object.keys(messageTypes)
    .map(key => messageTypes[key])
    .filter(type => messageSpecs[type].includedInRepliesCount);

  const sidebarMembersQuery = SQL`
    SELECT t.id AS threadID, m.user AS userID
    FROM threads t
    INNER JOIN memberships m ON t.id = m.thread
    WHERE t.source_message IS NOT NULL
      AND m.role >= 0
  `;
  const readCountUpdate = SQL`
    UPDATE threads t
    INNER JOIN (
      SELECT thread AS threadID, COUNT(*) AS count
      FROM messages
      WHERE type IN (${includedMessageTypes})
      GROUP BY thread
    ) c ON c.threadID = t.id
    SET t.replies_count = c.count 
    WHERE t.source_message IS NOT NULL
  `;
  const [[sidebarMembers]] = await Promise.all([
    dbQuery(sidebarMembersQuery),
    dbQuery(readCountUpdate),
  ]);

  const time = Date.now();
  const updates = sidebarMembers.map(({ threadID, userID }) => ({
    userID,
    time,
    threadID,
    type: updateTypes.UPDATE_THREAD,
  }));
  await createUpdates(updates);
}

export async function determineSenderStatus() {
  const includedMessageTypes = Object.keys(messageTypes)
    .map(key => messageTypes[key])
    .filter(type => messageSpecs[type].includedInRepliesCount);

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

main([
  addRepliesCountColumn,
  addSenderColumn,
  computeRepliesCount,
  determineSenderStatus,
]);
