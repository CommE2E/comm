// @flow

import {
  updateCalendarCommunityFilter,
  clearCalendarCommunityFilter,
  updateChatCommunityFilter,
  clearChatCommunityFilter,
} from 'lib/actions/community-actions.js';
import type { ThreadStore } from 'lib/types/thread-types.js';

import type { Action, CommunityPickerStore } from './redux-setup';

export function reduceCommunityPickerStore(
  communityPickerStore: CommunityPickerStore,
  threadStore: ThreadStore,
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
  } else if (action.type === updateChatCommunityFilter) {
    return {
      ...communityPickerStore,
      chat: action.payload,
    };
  } else if (action.type === clearChatCommunityFilter) {
    return {
      ...communityPickerStore,
      chat: null,
    };
  }
  return communityPickerStore;
}
