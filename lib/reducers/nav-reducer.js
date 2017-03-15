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
      home: false,
      calendarID: action.payload.id,
    };
  }
  return state;
}
