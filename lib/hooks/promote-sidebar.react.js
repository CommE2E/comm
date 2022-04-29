// @flow

import * as React from 'react';

import {
  changeThreadSettingsActionTypes,
  changeThreadSettings,
} from '../actions/thread-actions';
import { createLoadingStatusSelector } from '../selectors/loading-selectors';
import { threadInfoSelector } from '../selectors/thread-selectors';
import { threadHasPermission } from '../shared/thread-utils';
import type { LoadingStatus } from '../types/loading-types';
import {
  threadTypes,
  type ThreadInfo,
  threadPermissions,
} from '../types/thread-types';
import { useServerCall, useDispatchActionPromise } from '../utils/action-utils';
import { useSelector } from '../utils/redux-utils';

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
  const callChangeThreadSettings = useServerCall(changeThreadSettings);
  const loadingStatusSelector = createLoadingStatusSelector(
    changeThreadSettingsActionTypes,
  );
  const loadingStatus = useSelector(loadingStatusSelector);

  const { parentThreadID } = threadInfo;
  const parentThreadInfo: ?ThreadInfo = useSelector(state =>
    parentThreadID ? threadInfoSelector(state)[parentThreadID] : null,
  );
  const canChangeThreadType = threadHasPermission(
    threadInfo,
    threadPermissions.EDIT_PERMISSIONS,
  );
  const canCreateSubchannelsInParent = threadHasPermission(
    parentThreadInfo,
    threadPermissions.CREATE_SUBCHANNELS,
  );
  const canPromoteSidebar =
    threadInfo.type === threadTypes.SIDEBAR &&
    canChangeThreadType &&
    canCreateSubchannelsInParent;

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
      canPromoteSidebar,
    }),
    [onClick, loadingStatus, canPromoteSidebar],
  );

  return returnValues;
}

export { usePromoteSidebar };
