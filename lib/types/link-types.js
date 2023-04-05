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
