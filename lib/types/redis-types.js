// @flow

import type { RawMessageInfo } from './message-types.js';
import type { RawUpdateInfo } from './update-types.js';

// The types of messages that can be published to Redis
export const redisMessageTypes = Object.freeze({
  START_SUBSCRIPTION: 0,
  NEW_UPDATES: 1,
  NEW_MESSAGES: 2,
});
export type RedisMessageTypes = $Values<typeof redisMessageTypes>;

// This message is sent to a session channel indicating that a client just
// connected with this session ID. Since there should only ever be a single
// session active for a given sessionID, this message tells all sessions with a
// different instanceID to terminate their sockets.
type StartSubscriptionRedisMessage = {
  type: 0,
  instanceID: string,
};
export type NewUpdatesRedisMessage = {
  type: 1,
  updates: $ReadOnlyArray<RawUpdateInfo>,
  ignoreSession?: string,
};
type NewMessagesRedisMessage = {
  type: 2,
  messages: $ReadOnlyArray<RawMessageInfo>,
};

export type RedisMessage =
  | StartSubscriptionRedisMessage
  | NewUpdatesRedisMessage
  | NewMessagesRedisMessage;

export type UpdateTarget = { userID: string, +sessionID?: string };
export type SessionIdentifier = { userID: string, sessionID: string };
