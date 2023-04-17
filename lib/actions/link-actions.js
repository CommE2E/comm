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
    return await callServerEndpoint('verify_invite_link', request);
  };

export { verifyInviteLinkActionTypes, verifyInviteLink };
