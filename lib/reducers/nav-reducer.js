// @flow

import type {
  BaseAppState,
  BaseAction,
} from '../types/redux-types';
import type { BaseNavInfo } from '../types/nav-types';

export default function reduceBaseNavInfo(
  state: BaseNavInfo,
  action: BaseAction,
) {
  if (
    action.type === "NEW_CALENDAR_SUCCESS" ||
      action.type === "AUTH_CALENDAR_SUCCESS"
  ) {
    return {
      ...state,
      home: false,
      calendarID: action.payload.id,
    };
  } else if (action.type === "FETCH_ENTRIES_AND_SET_RANGE_SUCCESS") {
    return {
      ...state,
      startDate: action.payload.startDate,
      endDate: action.payload.endDate,
    };
  } else if (
    action.type === "LOG_IN_SUCCESS" ||
      action.type === "RESET_PASSWORD_SUCCESS" ||
      action.type === "PING_SUCCESS"
  ) {
    const entriesResult = action.payload.entriesResult;
    if (entriesResult) {
      return {
        ...state,
        startDate: entriesResult.startDate,
        endDate: entriesResult.endDate,
      };
    }
  }
  return state;
}
