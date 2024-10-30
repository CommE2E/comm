// @flow

import type { CallSingleKeyserverEndpoint } from '../keyserver-conn/call-single-keyserver-endpoint.js';
import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
import { useKeyserverCall } from '../keyserver-conn/keyserver-call.js';
import type { CallKeyserverEndpoint } from '../keyserver-conn/keyserver-conn-types.js';
import type {
  ServerCommunityInfo,
  FetchCommunityInfosResponse,
  ClientFetchAllCommunityInfosWithNamesResponse,
  CreateOrUpdateFarcasterChannelTagRequest,
  CreateOrUpdateFarcasterChannelTagResponse,
  DeleteFarcasterChannelTagRequest,
  DeleteFarcasterChannelTagPayload,
} from '../types/community-types.js';

const updateCalendarCommunityFilter = 'UPDATE_CALENDAR_COMMUNITY_FILTER';
const clearCalendarCommunityFilter = 'CLEAR_CALENDAR_COMMUNITY_FILTER';
const updateChatCommunityFilter = 'UPDATE_CHAT_COMMUNITY_FILTER';
const clearChatCommunityFilter = 'CLEAR_CHAT_COMMUNITY_FILTER';

const addCommunityActionType = 'ADD_COMMUNITY';

const fetchCommunityInfosActionTypes = Object.freeze({
  started: 'FETCH_COMMUNITY_INFOS_STARTED',
  success: 'FETCH_COMMUNITY_INFOS_SUCCESS',
  failed: 'FETCH_COMMUNITY_INFOS_FAILED',
});

const fetchCommunityInfos =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    allKeyserverIDs: $ReadOnlyArray<string>,
  ): (() => Promise<FetchCommunityInfosResponse>) =>
  async () => {
    const requests: { [string]: void } = {};

    for (const keyserverID of allKeyserverIDs) {
      requests[keyserverID] = undefined;
    }

    const responses = await callKeyserverEndpoint(
      'fetch_community_infos',
      requests,
    );

    let communityInfos: $ReadOnlyArray<ServerCommunityInfo> = [];

    for (const keyserverID in responses) {
      communityInfos = communityInfos.concat(
        responses[keyserverID].communityInfos,
      );
    }

    return {
      communityInfos,
    };
  };

function useFetchCommunityInfos(): () => Promise<FetchCommunityInfosResponse> {
  return useKeyserverCall(fetchCommunityInfos);
}

const fetchAllCommunityInfosWithNamesActionTypes = Object.freeze({
  started: 'FETCH_ALL_COMMUNITY_INFOS_WITH_NAMES_STARTED',
  success: 'FETCH_ALL_COMMUNITY_INFOS_WITH_NAMES_SUCCESS',
  failed: 'FETCH_ALL_COMMUNITY_INFOS_WITH_NAMES_FAILED',
});
const fetchAllCommunityInfosWithNames =
  (
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
  ): (() => Promise<ClientFetchAllCommunityInfosWithNamesResponse>) =>
  () =>
    callSingleKeyserverEndpoint('fetch_all_community_infos_with_names');
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

    return responses[keyserverID];
  };

function useCreateOrUpdateFarcasterChannelTag(): (
  input: CreateOrUpdateFarcasterChannelTagRequest,
) => Promise<CreateOrUpdateFarcasterChannelTagResponse> {
  return useKeyserverCall(createOrUpdateFarcasterChannelTag);
}

const deleteFarcasterChannelTagActionTypes = Object.freeze({
  started: 'DELETE_FARCASTER_CHANNEL_TAG_STARTED',
  success: 'DELETE_FARCASTER_CHANNEL_TAG_SUCCESS',
  failed: 'DELETE_FARCASTER_CHANNEL_TAG_FAILED',
});

const deleteFarcasterChannelTag =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: DeleteFarcasterChannelTagRequest,
  ) => Promise<DeleteFarcasterChannelTagPayload>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.commCommunityID);

    const requests = {
      [keyserverID]: {
        commCommunityID: input.commCommunityID,
        farcasterChannelID: input.farcasterChannelID,
      },
    };

    const responses = await callKeyserverEndpoint(
      'delete_farcaster_channel_tag',
      requests,
    );

    const response = responses[keyserverID];

    return {
      commCommunityID: input.commCommunityID,
      ...response,
    };
  };

function useDeleteFarcasterChannelTag(): (
  input: DeleteFarcasterChannelTagRequest,
) => Promise<DeleteFarcasterChannelTagPayload> {
  return useKeyserverCall(deleteFarcasterChannelTag);
}

export {
  updateCalendarCommunityFilter,
  clearCalendarCommunityFilter,
  updateChatCommunityFilter,
  clearChatCommunityFilter,
  addCommunityActionType,
  fetchCommunityInfosActionTypes,
  useFetchCommunityInfos,
  fetchAllCommunityInfosWithNamesActionTypes,
  fetchAllCommunityInfosWithNames,
  createOrUpdateFarcasterChannelTagActionTypes,
  useCreateOrUpdateFarcasterChannelTag,
  deleteFarcasterChannelTagActionTypes,
  useDeleteFarcasterChannelTag,
};
