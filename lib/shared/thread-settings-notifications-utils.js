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

type NotificationSettings = 'focused' | 'badge-only' | 'background';

const threadSettingsNotificationsCopy = {
  BANNER_NOTIFS: 'Banner notifs',
  BADGE_COUNT: 'Badge count',
  IN_FOCUSED_TAB: 'Lives in Focused tab',
  IN_BACKGROUND_TAB: 'Lives in Background tab',
  FOCUSED: 'Focused (enabled)',
  BADGE_ONLY: 'Focused (badge only)',
  BACKGROUND: 'Background',
  SIDEBAR_TITLE: 'Thread notifications',
  CHANNEL_TITLE: 'Channel notifications',
  IS_SIDEBAR:
    'It’s not possible to move this thread to Background. ' +
    'That’s because Comm’s design always shows threads ' +
    'underneath their parent in the Inbox, which means ' +
    'that if a thread’s parent is in Focused, the thread ' +
    'must also be there.',
  IS_SIDEBAR_CAN_PROMOTE:
    'If you want to move this thread to Background, ' +
    'you can either move the parent to Background, ' +
    'or you can promote the thread to a channel.',
  IS_SIDEBAR_CAN_NOT_PROMOTE:
    'If you want to move this thread to Background, ' +
    'you’ll have to move the parent to Background.',
  PARENT_THREAD_IS_BACKGROUND:
    'It’s not possible to change the notif settings for a thread ' +
    'whose parent is in Background. That’s because Comm’s design ' +
    'always shows threads underneath their parent in the Inbox, ' +
    'which means that if a thread’s parent is in Background, the ' +
    'thread must also be there.',
  PARENT_THREAD_IS_BACKGROUND_CAN_PROMOTE:
    'If you want to change the notif settings for this thread, ' +
    'you can either change the notif settings for the parent, ' +
    'or you can promote the thread to a channel.',
  PARENT_THREAD_IS_BACKGROUND_CAN_NOT_PROMOTE:
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
  +onFocusedSelected: () => mixed,
  +onBadgeOnlySelected: () => mixed,
  +onBackgroundSelected: () => mixed,
  +saveButtonDisabled: boolean,
  +onSave: () => mixed,
  +isSidebar: boolean,
  +canPromoteSidebar: boolean,
  +parentThreadIsInBackground: boolean,
} {
  const subscription = threadInfo.currentUser.subscription;

  const initialThreadSetting = React.useMemo<NotificationSettings>(() => {
    if (!subscription.home) {
      return 'background';
    }
    if (!subscription.pushNotifs) {
      return 'badge-only';
    }
    return 'focused';
  }, [subscription.home, subscription.pushNotifs]);

  const [notificationSettings, setNotificationSettings] =
    React.useState<NotificationSettings>(initialThreadSetting);

  const onFocusedSelected = React.useCallback(
    () => setNotificationSettings('focused'),
    [],
  );
  const onBadgeOnlySelected = React.useCallback(
    () => setNotificationSettings('badge-only'),
    [],
  );
  const onBackgroundSelected = React.useCallback(
    () => setNotificationSettings('background'),
    [],
  );

  const dispatchActionPromise = useDispatchActionPromise();

  const callUpdateSubscription = useUpdateSubscription();

  const updateSubscriptionPromise = React.useCallback(async () => {
    const res = await callUpdateSubscription({
      threadID: threadInfo.id,
      updatedFields: {
        home: notificationSettings !== 'background',
        pushNotifs: notificationSettings === 'focused',
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

  const parentThreadIsInBackground =
    isSidebar && !parentThreadInfo?.currentUser.subscription.home;

  return {
    notificationSettings,
    onFocusedSelected,
    onBadgeOnlySelected,
    onBackgroundSelected,
    saveButtonDisabled,
    onSave,
    isSidebar,
    canPromoteSidebar,
    parentThreadIsInBackground,
  };
}

export { threadSettingsNotificationsCopy, useThreadSettingsNotifications };
