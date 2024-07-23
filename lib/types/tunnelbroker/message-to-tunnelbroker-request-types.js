// @flow

export type MessageToTunnelbrokerRequest = {
  +type: 'MessageToTunnelbrokerRequest',
  +clientMessageID: string,
  +payload: string,
};
