// @flow

import * as React from 'react';

import { OlmSessionCreatorContext } from 'lib/shared/olm-session-creator-context.js';
import type { OLMIdentityKeys } from 'lib/types/crypto-types.js';
import type { OlmSessionInitializationInfo } from 'lib/types/request-types.js';

import {
  nativeNotificationsSessionCreator,
  nativeOutboundContentSessionCreator,
} from '../utils/crypto-utils.js';

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

function contentSessionCreator(
  contentIdentityKeys: OLMIdentityKeys,
  contentInitializationInfo: OlmSessionInitializationInfo,
) {
  return nativeOutboundContentSessionCreator(
    contentIdentityKeys,
    contentInitializationInfo,
    contentIdentityKeys.ed25519,
  );
}

const contextValue = {
  notificationsSessionCreator,
  contentSessionCreator,
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
