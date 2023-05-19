// @flow

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
  +expirationTime: ?number,
  +limitOfUses: ?number,
  +numberOfUses: number,
};

export type FetchInviteLinksResponse = {
  +links: $ReadOnlyArray<InviteLink>,
};
