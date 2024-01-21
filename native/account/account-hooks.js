// @flow

import * as React from 'react';

import { OlmSessionCreatorContext } from 'lib/shared/olm-session-creator-context.js';
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
  keyserverID: string,
) {
  return nativeNotificationsSessionCreator(
    notificationsIdentityKeys,
    notificationsInitializationInfo,
    keyserverID,
  );
}

const contextValue = {
  notificationsSessionCreator,
};

function OlmSessionCreatorProvider(props: Props): React.Node {
  const { children } = props;
  return (
    <OlmSessionCreatorContext.Provider value={contextValue}>
      {children}
    </OlmSessionCreatorContext.Provider>
  );
}

export { OlmSessionCreatorProvider };
