// @flow

import * as React from 'react';

import {
  changeThreadSettingsActionTypes,
  useChangeThreadSettings,
} from '../actions/thread-actions.js';
import { createLoadingStatusSelector } from '../selectors/loading-selectors.js';
import { threadInfoSelector } from '../selectors/thread-selectors.js';
import {
  threadHasPermission,
  threadIsSidebar,
} from '../shared/thread-utils.js';
import type { LoadingStatus } from '../types/loading-types.js';
import type { MinimallyEncodedThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';
import { threadTypes } from '../types/thread-types-enum.js';
import { type ThreadInfo } from '../types/thread-types.js';
import { useDispatchActionPromise } from '../utils/action-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function canPromoteSidebar(
  sidebarThreadInfo: ThreadInfo | MinimallyEncodedThreadInfo,
  parentThreadInfo: ?ThreadInfo | ?MinimallyEncodedThreadInfo,
): boolean {
  if (!threadIsSidebar(sidebarThreadInfo)) {
    return false;
  }

  const canChangeThreadType = threadHasPermission(
    sidebarThreadInfo,
    threadPermissions.EDIT_PERMISSIONS,
  );
  const canCreateSubchannelsInParent = threadHasPermission(
    parentThreadInfo,
    threadPermissions.CREATE_SUBCHANNELS,
  );
  return canChangeThreadType && canCreateSubchannelsInParent;
}

type PromoteSidebarType = {
  +onPromoteSidebar: () => void,
  +loading: LoadingStatus,
  +canPromoteSidebar: boolean,
};

function usePromoteSidebar(
  threadInfo: ThreadInfo | MinimallyEncodedThreadInfo,
  onError?: () => mixed,
): PromoteSidebarType {
  const dispatchActionPromise = useDispatchActionPromise();
  const callChangeThreadSettings = useChangeThreadSettings();
  const loadingStatusSelector = createLoadingStatusSelector(
    changeThreadSettingsActionTypes,
  );
  const loadingStatus = useSelector(loadingStatusSelector);

  const { parentThreadID } = threadInfo;
  const parentThreadInfo: ?ThreadInfo | ?MinimallyEncodedThreadInfo =
    useSelector(state =>
      parentThreadID ? threadInfoSelector(state)[parentThreadID] : null,
    );

  const canPromote = canPromoteSidebar(threadInfo, parentThreadInfo);

  const onClick = React.useCallback(() => {
    try {
      dispatchActionPromise(
        changeThreadSettingsActionTypes,
        (async () => {
          return await callChangeThreadSettings({
            threadID: threadInfo.id,
            changes: { type: threadTypes.COMMUNITY_OPEN_SUBTHREAD },
          });
        })(),
      );
    } catch (e) {
      onError?.();
      throw e;
    }
  }, [threadInfo.id, callChangeThreadSettings, dispatchActionPromise, onError]);

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

export { usePromoteSidebar, canPromoteSidebar };
