// @flow

import * as React from 'react';

import {
  preparePushNotifs,
  type PerUserNotifBuildResult,
} from './send-utils.js';
import { ENSCacheContext } from '../components/ens-cache-provider.react.js';
import { NeynarClientContext } from '../components/neynar-client-provider.react.js';
import type { MessageData } from '../types/message-types.js';
import { useSelector } from '../utils/redux-utils.js';

function usePreparePushNotifs(): (
  messageDatas: $ReadOnlyArray<MessageData>,
) => Promise<?PerUserNotifBuildResult> {
  const rawMessageInfos = useSelector(state => state.messageStore.messages);
  const rawThreadInfos = useSelector(state => state.threadStore.threadInfos);
  const auxUserInfos = useSelector(state => state.auxUserStore.auxUserInfos);
  const userInfos = useSelector(state => state.userStore.userInfos);

  const { getENSNames } = React.useContext(ENSCacheContext);
  const getFCNames = React.useContext(NeynarClientContext)?.getFCNames;

  return React.useCallback(
    (messageDatas: $ReadOnlyArray<MessageData>) => {
      return preparePushNotifs({
        messageInfos: rawMessageInfos,
        rawThreadInfos,
        auxUserInfos,
        messageDatas,
        userInfos,
        getENSNames,
        getFCNames,
      });
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
