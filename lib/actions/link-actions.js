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
import type { CallServerEndpoint } from '../utils/call-server-endpoint.js';

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
    callServerEndpoint: CallServerEndpoint,
  ): (() => Promise<FetchInviteLinksResponse>) =>
  async () => {
    const response = await callServerEndpoint('fetch_primary_invite_links');
    return {
      links: response.links,
    };
  };

const createOrUpdatePublicLinkActionTypes = Object.freeze({
  started: 'CREATE_OR_UPDATE_PUBLIC_LINK_STARTED',
  success: 'CREATE_OR_UPDATE_PUBLIC_LINK_SUCCESS',
  failed: 'CREATE_OR_UPDATE_PUBLIC_LINK_FAILED',
});

const createOrUpdatePublicLink =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((request: CreateOrUpdatePublicLinkRequest) => Promise<InviteLink>) =>
  async request => {
    const response = await callServerEndpoint('create_or_update_public_link', {
      name: request.name,
      communityID: request.communityID,
    });
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

const disableInviteLinkLinkActionTypes = Object.freeze({
  started: 'DISABLE_INVITE_LINK_STARTED',
  success: 'DISABLE_INVITE_LINK_SUCCESS',
  failed: 'DISABLE_INVITE_LINK_FAILED',
});

const disableInviteLink =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    request: DisableInviteLinkRequest,
  ) => Promise<DisableInviteLinkPayload>) =>
  async request => {
    await callServerEndpoint('disable_invite_link', request);
    return {
      name: request.name,
      communityID: request.communityID,
    };
  };

export {
  verifyInviteLinkActionTypes,
  verifyInviteLink,
  fetchPrimaryInviteLinkActionTypes,
  fetchPrimaryInviteLinks,
  createOrUpdatePublicLinkActionTypes,
  createOrUpdatePublicLink,
  disableInviteLinkLinkActionTypes,
  disableInviteLink,
};
