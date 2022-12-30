// @flow

import invariant from 'invariant';

import { createLocalEntryActionType } from '../actions/entry-actions';
import {
  sendTextMessageActionTypes,
  sendMultimediaMessageActionTypes,
  createLocalMessageActionType,
  processMessagesActionType,
  fetchMessagesBeforeCursorActionTypes,
  fetchMostRecentMessagesActionTypes,
  sendReactionMessageActionTypes,
} from '../actions/message-actions';
import { joinThreadActionTypes } from '../actions/thread-actions';
import {
  numberFromLocalID,
  highestLocalIDSelector,
} from '../selectors/local-id-selectors';
import type { RawMessageInfo } from '../types/message-types';
import type { BaseAction } from '../types/redux-types';
import { rehydrateActionType } from '../types/redux-types';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types';
import {
  updateTypes,
  type ClientUpdateInfo,
  processUpdatesActionType,
} from '../types/update-types';

export default function reduceNextLocalID(
  state: number,
  action: BaseAction,
): number {
  let newCandidate = null;
  if (action.type === rehydrateActionType) {
    newCandidate = highestLocalIDSelector(action.payload) + 1;
    if (
      action.payload &&
      action.payload.nextLocalID &&
      action.payload.nextLocalID > newCandidate
    ) {
      newCandidate = action.payload.nextLocalID;
    }
  } else if (
    action.type === sendTextMessageActionTypes.started ||
    action.type === sendMultimediaMessageActionTypes.started ||
    action.type === sendReactionMessageActionTypes.started ||
    action.type === createLocalEntryActionType ||
    action.type === createLocalMessageActionType
  ) {
    const { localID } = action.payload;
    invariant(localID, 'should be set');
    newCandidate = numberFromLocalID(localID) + 1;
  } else if (action.type === incrementalStateSyncActionType) {
    const messages = [
      ...action.payload.messagesResult.rawMessageInfos,
      ...getRawMessageInfosFromUpdates(action.payload.updatesResult.newUpdates),
    ];
    newCandidate = findHighestLocalID(messages) + 1;
  } else if (action.type === processUpdatesActionType) {
    const messages = getRawMessageInfosFromUpdates(
      action.payload.updatesResult.newUpdates,
    );
    newCandidate = findHighestLocalID(messages) + 1;
  } else if (
    action.type === fullStateSyncActionType ||
    action.type === processMessagesActionType
  ) {
    const messages = action.payload.messagesResult.rawMessageInfos;
    newCandidate = findHighestLocalID(messages) + 1;
  } else if (
    action.type === fetchMessagesBeforeCursorActionTypes.success ||
    action.type === fetchMostRecentMessagesActionTypes.success
  ) {
    const messages = action.payload.rawMessageInfos;
    newCandidate = findHighestLocalID(messages) + 1;
  } else if (action.type === joinThreadActionTypes.success) {
    const messages = [
      ...action.payload.rawMessageInfos,
      ...getRawMessageInfosFromUpdates(action.payload.updatesResult.newUpdates),
    ];
    newCandidate = findHighestLocalID(messages) + 1;
  }
  return newCandidate && newCandidate > state ? newCandidate : state;
}

function findHighestLocalID(
  rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
): number {
  let oldestID = -1;

  for (const rawMessageInfo of rawMessageInfos) {
    if (!rawMessageInfo.localID) {
      continue;
    }
    const { localID } = rawMessageInfo;
    if (!localID) {
      continue;
    }
    const thisLocalID = numberFromLocalID(localID);
    if (thisLocalID > oldestID) {
      oldestID = thisLocalID;
    }
  }

  return oldestID;
}

function getRawMessageInfosFromUpdates(
  updates: $ReadOnlyArray<ClientUpdateInfo>,
): RawMessageInfo[] {
  const rawMessageInfos = [];
  for (const updateInfo of updates) {
    if (updateInfo.type !== updateTypes.JOIN_THREAD) {
      continue;
    }
    for (const messageInfo of updateInfo.rawMessageInfos) {
      rawMessageInfos.push(messageInfo);
    }
  }
  return rawMessageInfos;
}
