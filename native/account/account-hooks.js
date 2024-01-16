// @flow

import * as React from 'react';

import { NotificationsSessionCreatorContext } from 'lib/shared/notifications-session-creator-context.js';
import type { OLMIdentityKeys } from 'lib/types/crypto-types.js';
import type { OlmSessionInitializationInfo } from 'lib/types/request-types.js';

import { nativeNotificationsSessionCreator } from '../utils/crypto-utils.js';

type Props = {
  +children: React.Node,
};

function notificationsSessionCreator(
  cookie: ?string,
  notificationsIdentityKeys: OLMIdentityKeys,
  notificationsInitializationInfo: OlmSessionInitializationInfo,
  deviceID: string,
) {
  return nativeNotificationsSessionCreator(
    notificationsIdentityKeys,
    notificationsInitializationInfo,
    deviceID,
  );
}

const contextValue = {
  notificationsSessionCreator,
};

function NotificationsSessionCreatorProvider(props: Props): React.Node {
  const { children } = props;
  return (
    <NotificationsSessionCreatorContext.Provider value={contextValue}>
      {children}
    </NotificationsSessionCreatorContext.Provider>
  );
}

export { NotificationsSessionCreatorProvider };
