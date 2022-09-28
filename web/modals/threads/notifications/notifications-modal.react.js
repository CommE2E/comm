// @flow

import * as React from 'react';

import {
  updateSubscription,
  updateSubscriptionActionTypes,
} from 'lib/actions/user-actions';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { threadTypes } from 'lib/types/thread-types';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import AllNotifsIllustration from '../../../assets/all-notifs.react.js';
import BadgeNotifsIllustration from '../../../assets/badge-notifs.react.js';
import MutedNotifsIllustration from '../../../assets/muted-notifs.react.js';
import Button from '../../../components/button.react';
import EnumSettingsOption from '../../../components/enum-settings-option.react';
import { useSelector } from '../../../redux/redux-utils';
import Modal from '../../modal.react';
import css from './notifications-modal.css';

type NotificationSettings = 'focused' | 'badge-only' | 'background';

function getStatements(includeTabStatements: boolean) {
  const BANNER_NOTIFS = 'Banner notifs';
  const BADGE_COUNT = 'Badge count';
  const IN_FOCUSED_TAB = 'Lives in Focused tab';
  const IN_BACKGROUND_TAB = 'Lives in Background tab';

  const focusedStatements = [
    {
      statement: BANNER_NOTIFS,
      isStatementValid: true,
      styleStatementBasedOnValidity: true,
    },
    {
      statement: BADGE_COUNT,
      isStatementValid: true,
      styleStatementBasedOnValidity: true,
    },
  ];
  if (includeTabStatements) {
    focusedStatements.push({
      statement: IN_FOCUSED_TAB,
      isStatementValid: true,
      styleStatementBasedOnValidity: true,
    });
  }

  const badgeOnlyStatements = [
    {
      statement: BANNER_NOTIFS,
      isStatementValid: false,
      styleStatementBasedOnValidity: true,
    },
    {
      statement: BADGE_COUNT,
      isStatementValid: true,
      styleStatementBasedOnValidity: true,
    },
  ];
  if (includeTabStatements) {
    badgeOnlyStatements.push({
      statement: IN_FOCUSED_TAB,
      isStatementValid: true,
      styleStatementBasedOnValidity: true,
    });
  }

  let backgroundStatements = null;
  if (includeTabStatements) {
    backgroundStatements = [
      {
        statement: BANNER_NOTIFS,
        isStatementValid: false,
        styleStatementBasedOnValidity: true,
      },
      {
        statement: BADGE_COUNT,
        isStatementValid: false,
        styleStatementBasedOnValidity: true,
      },
      {
        statement: IN_BACKGROUND_TAB,
        isStatementValid: true,
        styleStatementBasedOnValidity: true,
      },
    ];
  }

  return {
    focusedStatements,
    badgeOnlyStatements,
    backgroundStatements,
  };
}

type Props = {
  +threadID: string,
  +onClose: () => void,
};
function NotificationsModal(props: Props): React.Node {
  const { onClose, threadID } = props;
  const threadInfo = useSelector(state => threadInfoSelector(state)[threadID]);
  const { subscription } = threadInfo.currentUser;

  const isSidebar = threadInfo.type === threadTypes.SIDEBAR;

  const {
    focusedStatements,
    badgeOnlyStatements,
    backgroundStatements,
  } = React.useMemo(() => getStatements(!isSidebar), [isSidebar]);

  const initialThreadSetting = React.useMemo<NotificationSettings>(() => {
    if (!subscription.home) {
      return 'background';
    }
    if (!subscription.pushNotifs) {
      return 'badge-only';
    }
    return 'focused';
  }, [subscription.home, subscription.pushNotifs]);

  const [
    notificationSettings,
    setNotificationSettings,
  ] = React.useState<NotificationSettings>(initialThreadSetting);

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

  const isFocusedSelected = notificationSettings === 'focused';
  const focusedItem = React.useMemo(() => {
    const icon = <AllNotifsIllustration />;
    return (
      <EnumSettingsOption
        selected={isFocusedSelected}
        title="Focused (enabled)"
        statements={focusedStatements}
        icon={icon}
        onSelect={onFocusedSelected}
      />
    );
  }, [focusedStatements, isFocusedSelected, onFocusedSelected]);

  const isFocusedBadgeOnlySelected = notificationSettings === 'badge-only';
  const focusedBadgeOnlyItem = React.useMemo(() => {
    const icon = <BadgeNotifsIllustration />;
    return (
      <EnumSettingsOption
        selected={isFocusedBadgeOnlySelected}
        title="Focused (badge only)"
        statements={badgeOnlyStatements}
        icon={icon}
        onSelect={onBadgeOnlySelected}
      />
    );
  }, [badgeOnlyStatements, isFocusedBadgeOnlySelected, onBadgeOnlySelected]);

  const isBackgroundSelected = notificationSettings === 'background';
  const backgroundItem = React.useMemo(() => {
    if (backgroundStatements === null) {
      return null;
    }
    const icon = <MutedNotifsIllustration />;
    return (
      <EnumSettingsOption
        selected={isBackgroundSelected}
        title="Background"
        statements={backgroundStatements}
        icon={icon}
        onSelect={onBackgroundSelected}
      />
    );
  }, [backgroundStatements, isBackgroundSelected, onBackgroundSelected]);

  const dispatchActionPromise = useDispatchActionPromise();

  const callUpdateSubscription = useServerCall(updateSubscription);

  const onClickSave = React.useCallback(() => {
    dispatchActionPromise(
      updateSubscriptionActionTypes,
      callUpdateSubscription({
        threadID: threadID,
        updatedFields: {
          home: notificationSettings !== 'background',
          pushNotifs: notificationSettings === 'focused',
        },
      }),
    );
    onClose();
  }, [
    callUpdateSubscription,
    dispatchActionPromise,
    notificationSettings,
    onClose,
    threadID,
  ]);

  const modalName = isSidebar
    ? 'Thread notifications'
    : 'Channel notifications';

  return (
    <Modal name={modalName} size="fit-content" onClose={onClose}>
      <div className={css.container}>
        <div className={css.optionsContainer}>
          {focusedItem}
          {focusedBadgeOnlyItem}
          {backgroundItem}
        </div>
        <Button
          type="primary"
          onClick={onClickSave}
          disabled={notificationSettings === initialThreadSetting}
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}

export default NotificationsModal;
