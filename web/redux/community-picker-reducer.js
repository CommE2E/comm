// @flow

import {
  updateCalendarCommunityFilter,
  clearCalendarCommunityFilter,
} from 'lib/actions/community-actions.js';

import type { Action, CommunityPickerStore } from './redux-setup';

export function reduceCommunityPickerStore(
  communityPickerStore: CommunityPickerStore,
  action: Action,
): CommunityPickerStore {
  if (action.type === updateCalendarCommunityFilter) {
    return {
      ...communityPickerStore,
      calendar: action.payload,
    };
  } else if (action.type === clearCalendarCommunityFilter) {
    return {
      ...communityPickerStore,
      calendar: null,
    };
  }
  return communityPickerStore;
}
