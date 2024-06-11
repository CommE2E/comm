// @flow

import t, { type TUnion, type TInterface } from 'tcomb';

import { tShape, tID } from '../../utils/validation-utils.js';
import {
  type InviteLinkVerificationResponse,
  type FetchInviteLinksResponse,
  inviteLinkValidator,
} from '../link-types.js';

export const fetchInviteLinksResponseValidator: TInterface<FetchInviteLinksResponse> =
  tShape<FetchInviteLinksResponse>({
    links: t.list(inviteLinkValidator),
  });

const threadDataValidator = tShape<{
  +name: string,
  +id: string,
}>({
  name: t.String,
  id: tID,
});

export const inviteLinkVerificationResponseValidator: TUnion<InviteLinkVerificationResponse> =
  t.union([
    tShape({
      status: t.enums.of(['valid', 'already_joined']),
      community: threadDataValidator,
      thread: t.maybe(threadDataValidator),
    }),
    tShape({
      status: t.enums.of(['invalid', 'expired']),
    }),
  ]);
