// @flow

import type {
  BaseAppState,
  BaseAction,
} from '../types/redux-types';
import type { BaseNavInfo } from '../types/nav-types';

export default function reduceBaseNavInfo<T: BaseAppState>(
  state: BaseNavInfo,
  action: BaseAction<T>,
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
