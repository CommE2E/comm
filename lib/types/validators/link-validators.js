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
