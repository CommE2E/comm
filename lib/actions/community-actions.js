// @flow

import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
import { useKeyserverCall } from '../keyserver-conn/keyserver-call.js';
import type { CallKeyserverEndpoint } from '../keyserver-conn/keyserver-conn-types.js';
import type {
  CreateOrUpdateFarcasterChannelTagRequest,
  CreateOrUpdateFarcasterChannelTagResponse,
} from '../types/community-types.js';

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

const createOrUpdateFarcasterChannelTag =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: CreateOrUpdateFarcasterChannelTagRequest,
  ) => Promise<CreateOrUpdateFarcasterChannelTagResponse>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.commCommunityID);

    const requests = {
      [keyserverID]: {
        commCommunityID: input.commCommunityID,
        farcasterChannelID: input.farcasterChannelID,
      },
    };

    const responses = await callKeyserverEndpoint(
      'create_or_update_farcaster_channel_tag',
      requests,
    );

    const response = responses[keyserverID];

    return {
      commCommunityID: response.commCommunityID,
      blobHolder: response.blobHolder,
    };
  };

function useCreateOrUpdateFarcasterChannelTag(): (
  input: CreateOrUpdateFarcasterChannelTagRequest,
) => Promise<CreateOrUpdateFarcasterChannelTagResponse> {
  return useKeyserverCall(createOrUpdateFarcasterChannelTag);
}

export {
  updateCalendarCommunityFilter,
  clearCalendarCommunityFilter,
  updateChatCommunityFilter,
  clearChatCommunityFilter,
  addCommunityActionType,
  createOrUpdateFarcasterChannelTagActionTypes,
  useCreateOrUpdateFarcasterChannelTag,
};
