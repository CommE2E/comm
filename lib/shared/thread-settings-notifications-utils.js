// @flow

import * as React from 'react';

import { threadIsSidebar } from './thread-utils.js';
import {
  updateSubscriptionActionTypes,
  useUpdateSubscription,
} from '../actions/user-actions.js';
import { useCanPromoteSidebar } from '../hooks/promote-sidebar.react.js';
import { createLoadingStatusSelector } from '../selectors/loading-selectors.js';
import { threadInfoSelector } from '../selectors/thread-selectors.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadTypeIsThick } from '../types/thread-types-enum.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

type NotificationSettings = 'home' | 'notif-count-only' | 'muted';

const threadSettingsNotificationsCopy = {
  BANNER_NOTIFS: 'Banner notifs',
  NOTIF_COUNT: 'Notif count',
  IN_HOME_TAB: 'Lives in Home tab',
  IN_MUTED_TAB: 'Lives in Muted tab',
  HOME: 'Home',
  NOTIF_COUNT_ONLY: 'Home (notif count only)',
  MUTED: 'Muted',
  SIDEBAR_TITLE: 'Thread notifications',
  CHANNEL_TITLE: 'Channel notifications',
};

const updateSubscriptionLoadingStatusSelector = createLoadingStatusSelector(
  updateSubscriptionActionTypes,
);

function useThreadSettingsNotifications(
  threadInfo: ThreadInfo,
  onSuccessCallback: () => mixed,
): {
  +notificationSettings: NotificationSettings,
  +onHomeSelected: () => mixed,
  +onNotifCountOnlySelected: () => mixed,
  +onMutedSelected: () => mixed,
  +saveButtonDisabled: boolean,
  +onSave: () => mixed,
  +isSidebar: boolean,
  +canPromoteSidebar: boolean,
  +parentThreadIsMuted: boolean,
} {
  const subscription = threadInfo.currentUser.subscription;

  const initialThreadSetting = React.useMemo<NotificationSettings>(() => {
    if (!subscription.home) {
      return 'muted';
    }
    if (!subscription.pushNotifs) {
      return 'notif-count-only';
    }
    return 'home';
  }, [subscription.home, subscription.pushNotifs]);

  const [notificationSettings, setNotificationSettings] =
    React.useState<NotificationSettings>(initialThreadSetting);

  const onHomeSelected = React.useCallback(
    () => setNotificationSettings('home'),
    [],
  );
  const onNotifCountOnlySelected = React.useCallback(
    () => setNotificationSettings('notif-count-only'),
    [],
  );
  const onMutedSelected = React.useCallback(
    () => setNotificationSettings('muted'),
    [],
  );

  const dispatchActionPromise = useDispatchActionPromise();

  const callUpdateSubscription = useUpdateSubscription();

  const updateSubscriptionPromise = React.useCallback(async () => {
    const updateSubscriptionRequest = {
      threadID: threadInfo.id,
      updatedFields: {
        home: notificationSettings !== 'muted',
        pushNotifs: notificationSettings === 'home',
      },
    };
    const updateSubscriptionInput = threadTypeIsThick(threadInfo.type)
      ? {
          thick: true,
          threadInfo,
          ...updateSubscriptionRequest,
        }
      : {
          thick: false,
          ...updateSubscriptionRequest,
        };

    const res = await callUpdateSubscription(updateSubscriptionInput);

    onSuccessCallback();

    return res;
  }, [
    callUpdateSubscription,
    notificationSettings,
    onSuccessCallback,
    threadInfo,
  ]);

  const updateSubscriptionLoadingStatus = useSelector(
    updateSubscriptionLoadingStatusSelector,
  );
  const isLoading = updateSubscriptionLoadingStatus === 'loading';
  const saveButtonDisabled =
    isLoading || notificationSettings === initialThreadSetting;

  const onSave = React.useCallback(() => {
    if (saveButtonDisabled) {
      return;
    }

    void dispatchActionPromise(
      updateSubscriptionActionTypes,
      updateSubscriptionPromise(),
    );
  }, [saveButtonDisabled, dispatchActionPromise, updateSubscriptionPromise]);

  const isSidebar = threadIsSidebar(threadInfo);

  const { parentThreadID } = threadInfo;
  const parentThreadInfo = useSelector(state =>
    parentThreadID ? threadInfoSelector(state)[parentThreadID] : null,
  );

  const canPromoteSidebar = useCanPromoteSidebar(threadInfo, parentThreadInfo);

  const parentThreadIsMuted =
    isSidebar && !parentThreadInfo?.currentUser.subscription.home;

  return {
    notificationSettings,
    onHomeSelected,
    onNotifCountOnlySelected,
    onMutedSelected,
    saveButtonDisabled,
    onSave,
    isSidebar,
    canPromoteSidebar,
    parentThreadIsMuted,
  };
}

export { threadSettingsNotificationsCopy, useThreadSettingsNotifications };
