// @flow

import type {
  BaseAppState,
  BaseAction,
} from '../types/redux-types';
import type { ThreadInfo } from '../types/thread-types';

import invariant from 'invariant';
import _omitBy from 'lodash/fp/omitBy';
import _isEqual from 'lodash/fp/isEqual';

export default function reduceThreadInfos(
  state: {[id: string]: ThreadInfo},
  action: BaseAction,
): {[id: string]: ThreadInfo} {
  if (
    action.type === "LOG_OUT_SUCCESS" ||
      action.type === "DELETE_ACCOUNT_SUCCESS"
  ) {
    if (_isEqual(state, action.payload)) {
      return state;
    }
    return action.payload;
  } else if (
    action.type === "LOG_IN_SUCCESS" ||
      action.type === "RESET_PASSWORD_SUCCESS" ||
      action.type === "PING_SUCCESS"
  ) {
    if (_isEqual(state, action.payload.threadInfos)) {
      return state;
    }
    return action.payload.threadInfos;
  } else if (action.type === "SET_COOKIE" && action.payload.threadInfos) {
    if (_isEqual(state, action.payload.threadInfos)) {
      return state;
    }
    return action.payload.threadInfos;
  } else if (
    action.type === "CHANGE_CALENDAR_SETTINGS_SUCCESS" ||
      action.type === "NEW_CALENDAR_SUCCESS" ||
      action.type === "AUTH_CALENDAR_SUCCESS"
  ) {
    if (_isEqual(state[action.payload.id], action.payload)) {
      return state;
    }
    return {
      ...state,
      [action.payload.id]: action.payload,
    };
  } else if (action.type === "DELETE_CALENDAR_SUCCESS") {
    const threadID = action.payload;
    return _omitBy((candidate) => candidate.id === threadID)(state);
  } else if (action.type === "SUBSCRIBE_SUCCESS") {
    const threadID = action.payload.threadID;
    return {
      ...state,
      [threadID]: {
        ...state[threadID],
        subscribed: action.payload.newSubscribed,
      },
    };
  }
  return state;
}
