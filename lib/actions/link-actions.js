// @flow

import type {
  InviteLinkVerificationRequest,
  InviteLinkVerificationResponse,
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

export { verifyInviteLinkActionTypes, verifyInviteLink };
