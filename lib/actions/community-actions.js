// @flow

const updateCalendarCommunityFilter = 'UPDATE_CALENDAR_COMMUNITY_FILTER';
const clearCalendarCommunityFilter = 'CLEAR_CALENDAR_COMMUNITY_FILTER';
const updateChatCommunityFilter = 'UPDATE_CHAT_COMMUNITY_FILTER';
const clearChatCommunityFilter = 'CLEAR_CHAT_COMMUNITY_FILTER';

const addCommunityActionType = 'ADD_COMMUNITY';

const createOrUpdateFarcasterChannelTagActionTypes = Object.freeze({
  started: 'CREATE_OR_UPDATE_FARCASTER_CHANNEL_TAG_STARTED',
  success: 'CREATE_OR_UPDATE_FARCASTER_CHANNEL_TAG_SUCCESS',
  failed: 'CREATE_OR_UPDATE_FARCASTER_CHANNEL_TAG_FAILED',
});

export {
  updateCalendarCommunityFilter,
  clearCalendarCommunityFilter,
  updateChatCommunityFilter,
  clearChatCommunityFilter,
  addCommunityActionType,
  createOrUpdateFarcasterChannelTagActionTypes,
};
