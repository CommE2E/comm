// @flow

import * as React from 'react';

import { useCanPromoteSidebar } from 'lib/hooks/promote-sidebar.react.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { useThreadSettingsNotifications } from 'lib/shared/thread-settings-notifications-utils.js';
import { threadIsSidebar } from 'lib/shared/thread-utils.js';

import css from './notifications-modal.css';
import AllNotifsIllustration from '../../../assets/all-notifs.react.js';
import BadgeNotifsIllustration from '../../../assets/badge-notifs.react.js';
import MutedNotifsIllustration from '../../../assets/muted-notifs.react.js';
import Button from '../../../components/button.react.js';
import EnumSettingsOption from '../../../components/enum-settings-option.react.js';
import { useSelector } from '../../../redux/redux-utils.js';
import Modal from '../../modal.react.js';

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
  const { parentThreadID } = threadInfo;
  const parentThreadInfo = useSelector(state =>
    parentThreadID ? threadInfoSelector(state)[parentThreadID] : null,
  );
  const isSidebar = threadIsSidebar(threadInfo);

  const {
    notificationSettings,
    onFocusedSelected,
    onBadgeOnlySelected,
    onBackgroundSelected,
    saveButtonDisabled,
    onSave,
  } = useThreadSettingsNotifications(threadInfo, onClose);

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

  const modalName = isSidebar
    ? 'Thread notifications'
    : 'Channel notifications';

  const canPromoteSidebar = useCanPromoteSidebar(threadInfo, parentThreadInfo);
  const noticeText = React.useMemo(() => {
    if (!isSidebar) {
      return null;
    }

    return (
      <>
        <p className={css.notice}>
          {'It’s not possible to move this thread to Background. ' +
            'That’s because Comm’s design always shows threads ' +
            'underneath their parent in the Inbox, which means ' +
            'that if a thread’s parent is in Focused, the thread ' +
            'must also be there.'}
        </p>
        <p className={css.notice}>
          {canPromoteSidebar
            ? 'If you want to move this thread to Background, ' +
              'you can either move the parent to Background, ' +
              'or you can promote the thread to a channel.'
            : 'If you want to move this thread to Background, ' +
              'you’ll have to move the parent to Background.'}
        </p>
      </>
    );
  }, [isSidebar, canPromoteSidebar]);

  const parentThreadIsInBackground =
    isSidebar && !parentThreadInfo?.currentUser.subscription.home;

  const modalContent = React.useMemo(() => {
    if (parentThreadIsInBackground) {
      return (
        <>
          <p>
            {'It’s not possible to change the notif settings for a thread ' +
              'whose parent is in Background. That’s because Comm’s design ' +
              'always shows threads underneath their parent in the Inbox, ' +
              'which means that if a thread’s parent is in Background, the ' +
              'thread must also be there.'}
          </p>
          <p>
            {canPromoteSidebar
              ? 'If you want to change the notif settings for this thread, ' +
                'you can either change the notif settings for the parent, ' +
                'or you can promote the thread to a channel.'
              : 'If you want to change the notif settings for this thread, ' +
                'you’ll have to change the notif settings for the parent.'}
          </p>
        </>
      );
    }

    return (
      <>
        <div className={css.optionsContainer}>
          {focusedItem}
          {focusedBadgeOnlyItem}
          {backgroundItem}
        </div>
        {noticeText}
      </>
    );
  }, [
    backgroundItem,
    focusedBadgeOnlyItem,
    focusedItem,
    noticeText,
    parentThreadIsInBackground,
    canPromoteSidebar,
  ]);

  const saveButton = React.useMemo(() => {
    if (parentThreadIsInBackground) {
      return undefined;
    }

    return (
      <Button variant="filled" onClick={onSave} disabled={saveButtonDisabled}>
        Save
      </Button>
    );
  }, [saveButtonDisabled, onSave, parentThreadIsInBackground]);

  return (
    <Modal
      name={modalName}
      size="fit-content"
      onClose={onClose}
      primaryButton={saveButton}
    >
      <div className={css.container}>{modalContent}</div>
    </Modal>
  );
}

export default NotificationsModal;
