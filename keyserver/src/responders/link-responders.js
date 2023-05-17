// @flow

import t, { type TUnion, type TInterface } from 'tcomb';

import {
  type InviteLinkVerificationRequest,
  type InviteLinkVerificationResponse,
  type FetchInviteLinksResponse,
  inviteLinkValidator,
} from 'lib/types/link-types.js';
import { tShape, tID } from 'lib/utils/validation-utils.js';

import {
  fetchPrimaryInviteLinks,
  verifyInviteLink,
} from '../fetchers/link-fetchers.js';
import { Viewer } from '../session/viewer.js';
import { validateInput, validateOutput } from '../utils/validation-utils.js';

const inviteLinkVerificationRequestInputValidator: TInterface<InviteLinkVerificationRequest> =
  tShape({
    secret: t.String,
  });

export const inviteLinkVerificationResponseValidator: TUnion<InviteLinkVerificationResponse> =
  t.union([
    tShape({
      status: t.enums.of(['valid', 'already_joined']),
      community: tShape({
        name: t.String,
        id: tID,
      }),
    }),
    tShape({
      status: t.enums.of(['invalid', 'expired']),
    }),
  ]);

async function inviteLinkVerificationResponder(
  viewer: Viewer,
  input: any,
): Promise<InviteLinkVerificationResponse> {
  const request = await validateInput(
    viewer,
    inviteLinkVerificationRequestInputValidator,
    input,
  );
  const response = await verifyInviteLink(viewer, request);
  return validateOutput(
    viewer.platformDetails,
    inviteLinkVerificationResponseValidator,
    response,
  );
}

export const fetchInviteLinksResponseValidator: TInterface<FetchInviteLinksResponse> =
  tShape<FetchInviteLinksResponse>({
    links: t.list(inviteLinkValidator),
  });

async function fetchPrimaryInviteLinksResponder(
  viewer: Viewer,
): Promise<FetchInviteLinksResponse> {
  const primaryLinks = await fetchPrimaryInviteLinks(viewer);
  return validateOutput(
    viewer.platformDetails,
    fetchInviteLinksResponseValidator,
    {
      links: primaryLinks,
    },
  );
}

export { inviteLinkVerificationResponder, fetchPrimaryInviteLinksResponder };
