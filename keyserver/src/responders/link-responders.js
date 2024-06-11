// @flow

import t, { type TInterface } from 'tcomb';

import {
  type InviteLinkVerificationRequest,
  type InviteLinkVerificationResponse,
  type FetchInviteLinksResponse,
  type InviteLink,
  type CreateOrUpdatePublicLinkRequest,
  type DisableInviteLinkRequest,
  type InviteLinkWithHolder,
} from 'lib/types/link-types.js';
import { tShape, tID } from 'lib/utils/validation-utils.js';

import { createOrUpdatePublicLink } from '../creators/invite-link-creator.js';
import { deleteInviteLink } from '../deleters/link-deleters.js';
import {
  fetchPrimaryInviteLinks,
  verifyInviteLink,
} from '../fetchers/link-fetchers.js';
import { Viewer } from '../session/viewer.js';

export const inviteLinkVerificationRequestInputValidator: TInterface<InviteLinkVerificationRequest> =
  tShape({
    secret: t.String,
  });

async function inviteLinkVerificationResponder(
  viewer: Viewer,
  request: InviteLinkVerificationRequest,
): Promise<InviteLinkVerificationResponse> {
  return await verifyInviteLink(viewer, request);
}

async function fetchPrimaryInviteLinksResponder(
  viewer: Viewer,
): Promise<FetchInviteLinksResponse> {
  const primaryLinks = await fetchPrimaryInviteLinks(viewer);
  return {
    links: primaryLinks
      .filter(link => !link.threadID)
      .map(({ blobHolder, ...rest }: InviteLinkWithHolder) => rest),
  };
}

export const createOrUpdatePublicLinkInputValidator: TInterface<CreateOrUpdatePublicLinkRequest> =
  tShape<CreateOrUpdatePublicLinkRequest>({
    name: t.String,
    communityID: tID,
    threadID: t.maybe(tID),
  });

async function createOrUpdatePublicLinkResponder(
  viewer: Viewer,
  request: CreateOrUpdatePublicLinkRequest,
): Promise<InviteLink> {
  return await createOrUpdatePublicLink(viewer, request);
}

export const disableInviteLinkInputValidator: TInterface<DisableInviteLinkRequest> =
  tShape<DisableInviteLinkRequest>({
    name: t.String,
    communityID: tID,
  });

async function disableInviteLinkResponder(
  viewer: Viewer,
  request: DisableInviteLinkRequest,
): Promise<void> {
  await deleteInviteLink(viewer, request);
}

export {
  inviteLinkVerificationResponder,
  fetchPrimaryInviteLinksResponder,
  createOrUpdatePublicLinkResponder,
  disableInviteLinkResponder,
};
