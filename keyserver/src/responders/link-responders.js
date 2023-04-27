// @flow

import t from 'tcomb';

import type {
  InviteLinkVerificationRequest,
  InviteLinkVerificationResponse,
  FetchInviteLinksResponse,
} from 'lib/types/link-types.js';
import { tShape } from 'lib/utils/validation-utils.js';

import {
  fetchPrimaryInviteLinks,
  verifyInviteLink,
} from '../fetchers/link-fetchers.js';
import { Viewer } from '../session/viewer.js';
import { validateInput } from '../utils/validation-utils.js';

const inviteLinkVerificationRequestInputValidator = tShape({
  secret: t.String,
});

async function inviteLinkVerificationResponder(
  viewer: Viewer,
  input: any,
): Promise<InviteLinkVerificationResponse> {
  const request: InviteLinkVerificationRequest = input;
  await validateInput(
    viewer,
    inviteLinkVerificationRequestInputValidator,
    request,
  );
  return await verifyInviteLink(viewer, request);
}

async function fetchPrimaryInviteLinksResponder(
  viewer: Viewer,
): Promise<FetchInviteLinksResponse> {
  const primaryLinks = await fetchPrimaryInviteLinks(viewer);
  return {
    links: primaryLinks,
  };
}

export { inviteLinkVerificationResponder, fetchPrimaryInviteLinksResponder };
