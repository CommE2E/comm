// @flow

export const protocolNames = Object.freeze({
  COMM_DM: 'Comm DM',
  FARCASTER_DC: 'Farcaster DC',
  KEYSERVER: 'Keyserver',
});

export type ProtocolName = $Values<typeof protocolNames>;
