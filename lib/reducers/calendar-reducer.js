// @flow

import type {
  BaseAppState,
  BaseAction,
} from '../types/redux-types';
import type { CalendarInfo } from '../types/calendar-types';

import invariant from 'invariant';
import _omitBy from 'lodash/fp/omitBy';
import _isEqual from 'lodash/fp/isEqual';

export default function reduceCalendarInfos(
  state: {[id: string]: CalendarInfo},
  action: BaseAction,
): {[id: string]: CalendarInfo} {
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
      action.type === "SET_COOKIE"
  ) {
    if (_isEqual(state, action.payload.calendarInfos)) {
      return state;
    }
    return action.payload.calendarInfos;
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
    const calendarID = action.payload;
    return _omitBy((candidate) => candidate.id === calendarID)(state);
  } else if (action.type === "SUBSCRIBE_SUCCESS") {
    const calendarID = action.payload.calendarID;
    return {
      ...state,
      [calendarID]: {
        ...state[calendarID],
        subscribed: action.payload.newSubscribed,
      },
    };
  }
  return state;
}
