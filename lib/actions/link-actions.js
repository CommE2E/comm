// @flow

import type {
  FetchInviteLinksResponse,
  InviteLinkVerificationRequest,
  InviteLinkVerificationResponse,
  CreateOrUpdatePublicLinkRequest,
  InviteLink,
  DisableInviteLinkRequest,
  DisableInviteLinkPayload,
} from '../types/link-types.js';
import { extractKeyserverIDFromID } from '../utils/action-utils.js';
import type { CallServerEndpoint } from '../utils/call-server-endpoint.js';
import { useKeyserverCall } from '../utils/keyserver-call.js';
import type { CallKeyserverEndpoint } from '../utils/keyserver-call.js';

const verifyInviteLinkActionTypes = Object.freeze({
  started: 'VERIFY_INVITE_LINK_STARTED',
  success: 'VERIFY_INVITE_LINK_SUCCESS',
  failed: 'VERIFY_INVITE_LINK_FAILED',
});
const verifyInviteLink =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    request: InviteLinkVerificationRequest,
  ) => Promise<InviteLinkVerificationResponse>) =>
  async request => {
    const response = await callServerEndpoint('verify_invite_link', request);
    if (response.status === 'valid' || response.status === 'already_joined') {
      return {
        status: response.status,
        community: response.community,
      };
    }
    return {
      status: response.status,
    };
  };

const fetchPrimaryInviteLinkActionTypes = Object.freeze({
  started: 'FETCH_PRIMARY_INVITE_LINKS_STARTED',
  success: 'FETCH_PRIMARY_INVITE_LINKS_SUCCESS',
  failed: 'FETCH_PRIMARY_INVITE_LINKS_FAILED',
});
const fetchPrimaryInviteLinks =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    allKeyserverIDs: $ReadOnlyArray<string>,
  ): (() => Promise<FetchInviteLinksResponse>) =>
  async () => {
    const requests: { [string]: void } = {};
    for (const keyserverID of allKeyserverIDs) {
      requests[keyserverID] = undefined;
    }
    const responses = await callKeyserverEndpoint(
      'fetch_primary_invite_links',
      requests,
    );
    let links: $ReadOnlyArray<InviteLink> = [];
    for (const keyserverID in responses) {
      links = links.concat(responses[keyserverID].links);
    }
    return {
      links,
    };
  };

function useFetchPrimaryInviteLinks(): () => Promise<FetchInviteLinksResponse> {
  return useKeyserverCall(fetchPrimaryInviteLinks);
}

const createOrUpdatePublicLinkActionTypes = Object.freeze({
  started: 'CREATE_OR_UPDATE_PUBLIC_LINK_STARTED',
  success: 'CREATE_OR_UPDATE_PUBLIC_LINK_SUCCESS',
  failed: 'CREATE_OR_UPDATE_PUBLIC_LINK_FAILED',
});

const createOrUpdatePublicLink =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: CreateOrUpdatePublicLinkRequest) => Promise<InviteLink>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.communityID);
    const requests = {
      [keyserverID]: {
        name: input.name,
        communityID: input.communityID,
      },
    };

    const responses = await callKeyserverEndpoint(
      'create_or_update_public_link',
      requests,
    );
    const response = responses[keyserverID];
    return {
      name: response.name,
      primary: response.primary,
      role: response.role,
      communityID: response.communityID,
      expirationTime: response.expirationTime,
      limitOfUses: response.limitOfUses,
      numberOfUses: response.numberOfUses,
    };
  };

function useCreateOrUpdatePublicLink(): (
  input: CreateOrUpdatePublicLinkRequest,
) => Promise<InviteLink> {
  return useKeyserverCall(createOrUpdatePublicLink);
}

const disableInviteLinkLinkActionTypes = Object.freeze({
  started: 'DISABLE_INVITE_LINK_STARTED',
  success: 'DISABLE_INVITE_LINK_SUCCESS',
  failed: 'DISABLE_INVITE_LINK_FAILED',
});

const disableInviteLink =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: DisableInviteLinkRequest) => Promise<DisableInviteLinkPayload>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.communityID);
    const requests = { [keyserverID]: input };

    await callKeyserverEndpoint('disable_invite_link', requests);
    return input;
  };

function useDisableInviteLink(): (
  input: DisableInviteLinkRequest,
) => Promise<DisableInviteLinkPayload> {
  return useKeyserverCall(disableInviteLink);
}

export {
  verifyInviteLinkActionTypes,
  verifyInviteLink,
  fetchPrimaryInviteLinkActionTypes,
  useFetchPrimaryInviteLinks,
  createOrUpdatePublicLinkActionTypes,
  useCreateOrUpdatePublicLink,
  disableInviteLinkLinkActionTypes,
  useDisableInviteLink,
};
