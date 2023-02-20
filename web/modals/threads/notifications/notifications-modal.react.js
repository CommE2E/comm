// @flow

import * as React from 'react';

import {
  updateSubscription,
  updateSubscriptionActionTypes,
} from 'lib/actions/user-actions.js';
import { canPromoteSidebar } from 'lib/hooks/promote-sidebar.react.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { threadIsSidebar } from 'lib/shared/thread-utils.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import css from './notifications-modal.css';
import AllNotifsIllustration from '../../../assets/all-notifs.react.js';
import BadgeNotifsIllustration from '../../../assets/badge-notifs.react.js';
import MutedNotifsIllustration from '../../../assets/muted-notifs.react.js';
import Button from '../../../components/button.react.js';
import EnumSettingsOption from '../../../components/enum-settings-option.react.js';
import { useSelector } from '../../../redux/redux-utils.js';
import Modal from '../../modal.react.js';

type NotificationSettings = 'focused' | 'badge-only' | 'background';

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
  {
    statement: IN_FOCUSED_TAB,
    isStatementValid: true,
    styleStatementBasedOnValidity: true,
  },
];

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
  {
    statement: IN_FOCUSED_TAB,
    isStatementValid: true,
    styleStatementBasedOnValidity: true,
  },
];

const backgroundStatements = [
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

type Props = {
  +threadID: string,
  +onClose: () => void,
};
function NotificationsModal(props: Props): React.Node {
  const { onClose, threadID } = props;
  const threadInfo = useSelector(state => threadInfoSelector(state)[threadID]);
  const { subscription } = threadInfo.currentUser;
  const { parentThreadID } = threadInfo;
  const parentThreadInfo = useSelector(state =>
    parentThreadID ? threadInfoSelector(state)[parentThreadID] : null,
  );
  const isSidebar = threadIsSidebar(threadInfo);

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
  }, [isFocusedSelected, onFocusedSelected]);

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
  }, [isFocusedBadgeOnlySelected, onBadgeOnlySelected]);

  const isBackgroundSelected = notificationSettings === 'background';
  const backgroundItem = React.useMemo(() => {
    const icon = <MutedNotifsIllustration />;
    return (
      <EnumSettingsOption
        selected={isBackgroundSelected}
        title="Background"
        statements={backgroundStatements}
        icon={icon}
        disabled={isSidebar}
        onSelect={onBackgroundSelected}
      />
    );
  }, [isBackgroundSelected, onBackgroundSelected, isSidebar]);

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

  let modalContent;
  if (isSidebar && !parentThreadInfo?.currentUser.subscription.home) {
    modalContent = (
      <>
        <p>
          {'It’s not possible to change the notif settings for a thread ' +
            'whose parent is in Background. That’s because Comm’s design ' +
            'always shows threads underneath their parent in the Inbox, ' +
            'which means that if a thread’s parent is in Background, the ' +
            'thread must also be there.'}
        </p>
        <p>
          {canPromoteSidebar(threadInfo, parentThreadInfo)
            ? 'If you want to change the notif settings for this thread, ' +
              'you can either change the notif settings for the parent, ' +
              'or you can promote the thread to a channel.'
            : 'If you want to change the notif settings for this thread, ' +
              'you’ll have to change the notif settings for the parent.'}
        </p>
      </>
    );
  } else {
    let noticeText = null;
    if (isSidebar) {
      noticeText = (
        <>
          <p className={css.notice}>
            {'It’s not possible to move this thread to Background. ' +
              'That’s because Comm’s design always shows threads ' +
              'underneath their parent in the Inbox, which means ' +
              'that if a thread’s parent is in Focused, the thread ' +
              'must also be there.'}
          </p>
          <p className={css.notice}>
            {canPromoteSidebar(threadInfo, parentThreadInfo)
              ? 'If you want to move this thread to Background, ' +
                'you can either move the parent to Background, ' +
                'or you can promote the thread to a channel.'
              : 'If you want to move this thread to Background, ' +
                'you’ll have to move the parent to Background.'}
          </p>
        </>
      );
    }

    modalContent = (
      <>
        <div className={css.optionsContainer}>
          {focusedItem}
          {focusedBadgeOnlyItem}
          {backgroundItem}
        </div>
        <Button
          variant="filled"
          onClick={onClickSave}
          disabled={notificationSettings === initialThreadSetting}
        >
          Save
        </Button>
        {noticeText}
      </>
    );
  }

  return (
    <Modal name={modalName} size="fit-content" onClose={onClose}>
      <div className={css.container}>{modalContent}</div>
    </Modal>
  );
}

export default NotificationsModal;
