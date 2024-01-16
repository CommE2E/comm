// @flow

import * as React from 'react';

import type { OLMIdentityKeys } from '../types/crypto-types.js';
import type { OlmSessionInitializationInfo } from '../types/request-types.js';

export type NotificationsSessionCreatorContextType = {
  +notificationsSessionCreator: (
    cookie: ?string,
    notificationsIdentityKeys: OLMIdentityKeys,
    notificationsInitializationInfo: OlmSessionInitializationInfo,
    deviceID: string,
  ) => Promise<string>,
};

const NotificationsSessionCreatorContext: React.Context<?NotificationsSessionCreatorContextType> =
  React.createContext(null);

export { NotificationsSessionCreatorContext };
