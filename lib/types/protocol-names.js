// @flow

import t, { type TEnums } from 'tcomb';

import { values } from '../utils/objects.js';

export const protocolNames = Object.freeze({
  COMM_DM: 'Comm DM',
  FARCASTER_DC: 'Farcaster DC',
  KEYSERVER: 'Keyserver',
});

export type ProtocolName = $Values<typeof protocolNames>;

export const protocolNameValidator: TEnums = t.enums.of(values(protocolNames));
