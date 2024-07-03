// @flow

import * as React from 'react';

import {
  updateSubscriptionActionTypes,
  useUpdateSubscription,
} from '../actions/user-actions.js';
import { createLoadingStatusSelector } from '../selectors/loading-selectors.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

type NotificationSettings = 'focused' | 'badge-only' | 'background';

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

  return {
    notificationSettings,
    onFocusedSelected,
    onBadgeOnlySelected,
    onBackgroundSelected,
    saveButtonDisabled,
    onSave,
  };
}

export { useThreadSettingsNotifications };
