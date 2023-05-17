// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tShape } from '../utils/validation-utils.js';

export type InviteLinkVerificationRequest = {
  +secret: string,
};

export type InviteLinkVerificationResponse =
  | {
      +status: 'valid' | 'already_joined',
      +community: {
        +name: string,
        +id: string,
      },
    }
  | {
      +status: 'invalid' | 'expired',
    };

export type InviteLink = {
  +name: string,
  +primary: boolean,
  +role: string,
  +communityID: string,
  +expirationTime: number,
  +limitOfUses: number,
  +numberOfUses: number,
};

export const inviteLinkValidator: TInterface<InviteLink> = tShape<InviteLink>({
  name: t.String,
  primary: t.Boolean,
  role: tID,
  communityID: tID,
  expirationTime: t.Number,
  limitOfUses: t.Number,
  numberOfUses: t.Number,
});

export type FetchInviteLinksResponse = {
  +links: $ReadOnlyArray<InviteLink>,
};
