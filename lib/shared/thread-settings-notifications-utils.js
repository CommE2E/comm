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
  IS_SIDEBAR:
    'It’s not possible to move this thread to Muted. ' +
    'That’s because Comm’s design always shows threads ' +
    'underneath their parent in the Inbox, which means ' +
    'that if a thread’s parent is in Home, the thread ' +
    'must also be there.',
  IS_SIDEBAR_CAN_PROMOTE:
    'If you want to move this thread to Muted, ' +
    'you can either move the parent to Muted, ' +
    'or you can promote the thread to a channel.',
  IS_SIDEBAR_CAN_NOT_PROMOTE:
    'If you want to move this thread to Muted, ' +
    'you’ll have to move the parent to Muted.',
  PARENT_THREAD_IS_MUTED:
    'It’s not possible to change the notif settings for a thread ' +
    'whose parent is in Muted. That’s because Comm’s design ' +
    'always shows threads underneath their parent in the Inbox, ' +
    'which means that if a thread’s parent is in Muted, the ' +
    'thread must also be there.',
  PARENT_THREAD_IS_MUTED_CAN_PROMOTE:
    'If you want to change the notif settings for this thread, ' +
    'you can either change the notif settings for the parent, ' +
    'or you can promote the thread to a channel.',
  PARENT_THREAD_IS_MUTED_CAN_NOT_PROMOTE:
    'If you want to change the notif settings for this thread, ' +
    'you’ll have to change the notif settings for the parent.',
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

  const callUpdateSubscription = useUpdateSubscription(threadInfo);

  const updateSubscriptionPromise = React.useCallback(async () => {
    const res = await callUpdateSubscription({
      threadID: threadInfo.id,
      updatedFields: {
        home: notificationSettings !== 'muted',
        pushNotifs: notificationSettings === 'home',
      },
    });

    onSuccessCallback();

    return res;
  }, [
    callUpdateSubscription,
    notificationSettings,
    onSuccessCallback,
    threadInfo.id,
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
