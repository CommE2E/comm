// @flow

import * as React from 'react';

import {
  preparePushNotifs,
  type PerUserTargetedNotifications,
} from './send-utils.js';
import { ENSCacheContext } from '../components/ens-cache-provider.react.js';
import { NeynarClientContext } from '../components/neynar-client-provider.react.js';
import { usePeerOlmSessionsCreatorContext } from '../components/peer-olm-session-creator-provider.react.js';
import { thickRawThreadInfosSelector } from '../selectors/thread-selectors.js';
import type { MessageData } from '../types/message-types.js';
import type {
  EncryptedNotifUtilsAPI,
  SenderDeviceDescriptor,
} from '../types/notif-types.js';
import { useSelector } from '../utils/redux-utils.js';

function usePreparePushNotifs(): (
  encryptedNotifsUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  messageDatas: $ReadOnlyArray<MessageData>,
) => Promise<?PerUserTargetedNotifications> {
  const rawMessageInfos = useSelector(state => state.messageStore.messages);
  const thickRawThreadInfos = useSelector(thickRawThreadInfosSelector);
  const auxUserInfos = useSelector(state => state.auxUserStore.auxUserInfos);
  const userInfos = useSelector(state => state.userStore.userInfos);

  const { getENSNames } = React.useContext(ENSCacheContext);
  const getFCNames = React.useContext(NeynarClientContext)?.getFCNames;

  const { createOlmSessionsWithPeer: olmSessionCreator } =
    usePeerOlmSessionsCreatorContext();

  return React.useCallback(
    (
      encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
      senderDeviceDescriptor: SenderDeviceDescriptor,
      messageDatas: $ReadOnlyArray<MessageData>,
    ) => {
      return preparePushNotifs({
        encryptedNotifUtilsAPI,
        senderDeviceDescriptor,
        olmSessionCreator,
        messageInfos: rawMessageInfos,
        thickRawThreadInfos,
        auxUserInfos,
        messageDatas,
        userInfos,
        getENSNames,
        getFCNames,
      });
    },
    [
      olmSessionCreator,
      rawMessageInfos,
      thickRawThreadInfos,
      auxUserInfos,
      userInfos,
      getENSNames,
      getFCNames,
    ],
  );
}

export { usePreparePushNotifs };
