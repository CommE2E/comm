// @flow

import * as React from 'react';

import { type SIWEMessageType } from 'lib/types/siwe-types.js';

export type SIWEContextType = {
  +siweNonce: ?string,
  +siwePrimaryIdentityPublicKey: ?string,
  +siweMessageType: ?SIWEMessageType,
  +siweMessageIssuedAt: ?string,
};

const SIWEContext: React.Context<SIWEContextType> = React.createContext({
  siweNonce: null,
  siwePrimaryIdentityPublicKey: null,
  siweMessageType: null,
  siweMessageIssuedAt: null,
});

export { SIWEContext };
