// @flow

import * as React from 'react';

import {
  changeThreadSettingsActionTypes,
  useChangeThreadSettings,
} from '../actions/thread-actions.js';
import { createLoadingStatusSelector } from '../selectors/loading-selectors.js';
import { threadInfoSelector } from '../selectors/thread-selectors.js';
import {
  threadIsSidebar,
  useThreadHasPermission,
} from '../shared/thread-utils.js';
import type { LoadingStatus } from '../types/loading-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';
import { threadTypes } from '../types/thread-types-enum.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function useCanPromoteSidebar(
  sidebarThreadInfo: ThreadInfo,
  parentThreadInfo: ?ThreadInfo,
): boolean {
  const canChangeThreadType = useThreadHasPermission(
    sidebarThreadInfo,
    threadPermissions.EDIT_PERMISSIONS,
  );
  const canCreateSubchannelsInParent = useThreadHasPermission(
    parentThreadInfo,
    threadPermissions.CREATE_SUBCHANNELS,
  );

  return (
    threadIsSidebar(sidebarThreadInfo) &&
    canChangeThreadType &&
    canCreateSubchannelsInParent
  );
}

type PromoteSidebarType = {
  +onPromoteSidebar: () => void,
  +loading: LoadingStatus,
  +canPromoteSidebar: boolean,
};

function usePromoteSidebar(
  threadInfo: ThreadInfo,
  onError?: () => mixed,
): PromoteSidebarType {
  const dispatchActionPromise = useDispatchActionPromise();
  const callChangeThreadSettings = useChangeThreadSettings();
  const loadingStatusSelector = createLoadingStatusSelector(
    changeThreadSettingsActionTypes,
  );
  const loadingStatus = useSelector(loadingStatusSelector);

  const { parentThreadID } = threadInfo;
  const parentThreadInfo: ?ThreadInfo = useSelector(state =>
    parentThreadID ? threadInfoSelector(state)[parentThreadID] : null,
  );

  const canPromote = useCanPromoteSidebar(threadInfo, parentThreadInfo);

  const onClick = React.useCallback(() => {
    try {
      void dispatchActionPromise(
        changeThreadSettingsActionTypes,
        (async () => {
          return await callChangeThreadSettings({
            thick: false,
            threadID: threadInfo.id,
            threadInfo,
            changes: { type: threadTypes.COMMUNITY_OPEN_SUBTHREAD },
          });
        })(),
      );
    } catch (e) {
      onError?.();
      throw e;
    }
  }, [threadInfo, callChangeThreadSettings, dispatchActionPromise, onError]);

  const returnValues = React.useMemo(
    () => ({
      onPromoteSidebar: onClick,
      loading: loadingStatus,
      canPromoteSidebar: canPromote,
    }),
    [onClick, loadingStatus, canPromote],
  );

  return returnValues;
}

export { usePromoteSidebar, useCanPromoteSidebar };
