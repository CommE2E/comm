// @flow
import * as React from 'react';

import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
import type { CallKeyserverEndpoint } from '../keyserver-conn/keyserver-conn-types.js';
import type {
  FetchInviteLinksResponse,
  InviteLinkVerificationRequest,
  InviteLinkVerificationResponse,
  CreateOrUpdatePublicLinkRequest,
  InviteLink,
  DisableInviteLinkRequest,
  DisableInviteLinkPayload,
} from '../types/link-types.js';
import type { CallSingleKeyserverEndpoint } from '../utils/call-single-keyserver-endpoint.js';
import { useKeyserverCall } from '../utils/keyserver-call.js';
import { useSelector } from '../utils/redux-utils.js';
import { ashoatKeyserverID } from '../utils/validation-utils.js';

const verifyInviteLinkActionTypes = Object.freeze({
  started: 'VERIFY_INVITE_LINK_STARTED',
  success: 'VERIFY_INVITE_LINK_SUCCESS',
  failed: 'VERIFY_INVITE_LINK_FAILED',
});
const verifyInviteLink =
  (
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
  ): ((input: {
    +request: InviteLinkVerificationRequest,
    +keyserverID: string,
  }) => Promise<InviteLinkVerificationResponse>) =>
  async input => {
    const { request, keyserverID } = input;
    const requests = {
      [keyserverID]: request,
    };
    const responses = await callSingleKeyserverEndpoint(
      'verify_invite_link',
      requests,
    );
    const response = responses[keyserverID];
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

function useVerifyInviteLink(
  keyserverOverride?: ?{
    +keyserverID: string,
    +keyserverURL: string,
  },
): (
  request: InviteLinkVerificationRequest,
) => Promise<InviteLinkVerificationResponse> {
  const keyserverID = keyserverOverride?.keyserverID ?? ashoatKeyserverID;
  const isKeyserverKnown = useSelector(
    state => !!state.keyserverStore.keyserverInfos[keyserverID],
  );

  let paramOverride = null;
  if (keyserverOverride && !isKeyserverKnown) {
    paramOverride = {
      keyserverInfos: {
        [keyserverOverride.keyserverID]: {
          urlPrefix: keyserverOverride.keyserverURL,
        },
      },
    };
  }
  const callVerifyInviteLink = useKeyserverCall(
    verifyInviteLink,
    paramOverride,
  );
  return React.useCallback(
    (request: InviteLinkVerificationRequest) =>
      callVerifyInviteLink({ request, keyserverID }),
    [callVerifyInviteLink, keyserverID],
  );
}

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
  useVerifyInviteLink,
  fetchPrimaryInviteLinkActionTypes,
  useFetchPrimaryInviteLinks,
  createOrUpdatePublicLinkActionTypes,
  useCreateOrUpdatePublicLink,
  disableInviteLinkLinkActionTypes,
  useDisableInviteLink,
};
