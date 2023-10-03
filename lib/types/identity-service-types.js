// @flow

export type UserLoginResponse = {
  +userId: string,
  +accessToken: string,
};

export type OutboundKeyInfoResponse = {
  +payload: string,
  +payloadSignature: string,
  +socialProof?: ?string,
  +contentPrekey: string,
  +contentPrekeySignature: string,
  +notifPrekey: string,
  +notifPrekeySignature: string,
  +oneTimeContentPrekey?: ?string,
  +oneTimeNotifPrekey?: ?string,
};
