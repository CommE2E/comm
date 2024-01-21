// @flow

import * as React from 'react';

import type { OLMIdentityKeys } from '../types/crypto-types.js';
import type { OlmSessionInitializationInfo } from '../types/request-types.js';

export type OlmSessionCreatorContextType = {
  +notificationsSessionCreator: (
    cookie: ?string,
    notificationsIdentityKeys: OLMIdentityKeys,
    notificationsInitializationInfo: OlmSessionInitializationInfo,
    keyserverID: string,
  ) => Promise<string>,
};

const OlmSessionCreatorContext: React.Context<?OlmSessionCreatorContextType> =
  React.createContext(null);

export { OlmSessionCreatorContext };
