// @flow

import * as React from 'react';

import { preparePushNotifs } from './send-utils.js';
import { ENSCacheContext } from '../components/ens-cache-provider.react.js';
import { NeynarClientContext } from '../components/neynar-client-provider.react.js';
import type { MessageData } from '../types/message-types.js';
import type {
  EncryptedNotifUtilsAPI,
  SenderDeviceID,
  TargetedNotificationWithPlatform,
} from '../types/notif-types.js';
import { useSelector } from '../utils/redux-utils.js';

function usePreparePushNotifs(): (
  encryptedNotifsUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceID: SenderDeviceID,
  messageDatas: $ReadOnlyArray<MessageData>,
) => Promise<?{
  +[userID: string]: $ReadOnlyArray<TargetedNotificationWithPlatform>,
}> {
  const rawMessageInfos = useSelector(state => state.messageStore.messages);
  const rawThreadInfos = useSelector(state => state.threadStore.threadInfos);
  const auxUserInfos = useSelector(state => state.auxUserStore.auxUserInfos);
  const userInfos = useSelector(state => state.userStore.userInfos);

  const { getENSNames } = React.useContext(ENSCacheContext);
  const getFCNames = React.useContext(NeynarClientContext)?.getFCNames;

  return React.useCallback(
    (
      encryptedNotifsUtilsAPI: EncryptedNotifUtilsAPI,
      senderDeviceID: SenderDeviceID,
      messageDatas: $ReadOnlyArray<MessageData>,
    ) => {
      return preparePushNotifs(
        encryptedNotifsUtilsAPI,
        senderDeviceID,
        rawMessageInfos,
        rawThreadInfos,
        auxUserInfos,
        messageDatas,
        userInfos,
        getENSNames,
        getFCNames,
      );
    },
    [
      rawMessageInfos,
      rawThreadInfos,
      auxUserInfos,
      userInfos,
      getENSNames,
      getFCNames,
    ],
  );
}

export { usePreparePushNotifs };
