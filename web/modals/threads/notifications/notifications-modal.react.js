// @flow

import * as React from 'react';

import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import {
  threadSettingsNotificationsCopy,
  useThreadSettingsNotifications,
} from 'lib/shared/thread-settings-notifications-utils.js';

import css from './notifications-modal.css';
import AllNotifsIllustration from '../../../assets/all-notifs.react.js';
import BadgeNotifsIllustration from '../../../assets/badge-notifs.react.js';
import MutedNotifsIllustration from '../../../assets/muted-notifs.react.js';
import Button from '../../../components/button.react.js';
import EnumSettingsOption from '../../../components/enum-settings-option.react.js';
import { useSelector } from '../../../redux/redux-utils.js';
import Modal from '../../modal.react.js';

const focusedStatements = [
  {
    statement: threadSettingsNotificationsCopy.BANNER_NOTIFS,
    isStatementValid: true,
    styleStatementBasedOnValidity: true,
  },
  {
    statement: threadSettingsNotificationsCopy.NOTIF_COUNT,
    isStatementValid: true,
    styleStatementBasedOnValidity: true,
  },
  {
    statement: threadSettingsNotificationsCopy.IN_FOCUSED_TAB,
    isStatementValid: true,
    styleStatementBasedOnValidity: true,
  },
];

const badgeOnlyStatements = [
  {
    statement: threadSettingsNotificationsCopy.BANNER_NOTIFS,
    isStatementValid: false,
    styleStatementBasedOnValidity: true,
  },
  {
    statement: threadSettingsNotificationsCopy.NOTIF_COUNT,
    isStatementValid: true,
    styleStatementBasedOnValidity: true,
  },
  {
    statement: threadSettingsNotificationsCopy.IN_FOCUSED_TAB,
    isStatementValid: true,
    styleStatementBasedOnValidity: true,
  },
];

const backgroundStatements = [
  {
    statement: threadSettingsNotificationsCopy.BANNER_NOTIFS,
    isStatementValid: false,
    styleStatementBasedOnValidity: true,
  },
  {
    statement: threadSettingsNotificationsCopy.NOTIF_COUNT,
    isStatementValid: false,
    styleStatementBasedOnValidity: true,
  },
  {
    statement: threadSettingsNotificationsCopy.IN_BACKGROUND_TAB,
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

  const {
    notificationSettings,
    onFocusedSelected,
    onBadgeOnlySelected,
    onBackgroundSelected,
    saveButtonDisabled,
    onSave,
    isSidebar,
    canPromoteSidebar,
    parentThreadIsInBackground,
  } = useThreadSettingsNotifications(threadInfo, onClose);

  const isFocusedSelected = notificationSettings === 'focused';
  const focusedItem = React.useMemo(() => {
    const icon = <AllNotifsIllustration />;
    return (
      <EnumSettingsOption
        selected={isFocusedSelected}
        title={threadSettingsNotificationsCopy.FOCUSED}
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
        title={threadSettingsNotificationsCopy.BADGE_ONLY}
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
        title={threadSettingsNotificationsCopy.BACKGROUND}
        statements={backgroundStatements}
        icon={icon}
        disabled={isSidebar}
        onSelect={onBackgroundSelected}
      />
    );
  }, [isBackgroundSelected, onBackgroundSelected, isSidebar]);

  const modalName = isSidebar
    ? threadSettingsNotificationsCopy.SIDEBAR_TITLE
    : threadSettingsNotificationsCopy.CHANNEL_TITLE;

  const noticeText = React.useMemo(() => {
    if (!isSidebar) {
      return null;
    }

    return (
      <>
        <p className={css.notice}>
          {threadSettingsNotificationsCopy.IS_SIDEBAR}
        </p>
        <p className={css.notice}>
          {canPromoteSidebar
            ? threadSettingsNotificationsCopy.IS_SIDEBAR_CAN_PROMOTE
            : threadSettingsNotificationsCopy.IS_SIDEBAR_CAN_NOT_PROMOTE}
        </p>
      </>
    );
  }, [isSidebar, canPromoteSidebar]);

  const modalContent = React.useMemo(() => {
    if (parentThreadIsInBackground) {
      return (
        <>
          <p className={css.parentThreadIsInBackgroundNotice}>
            {threadSettingsNotificationsCopy.PARENT_THREAD_IS_BACKGROUND}
          </p>
          <p className={css.parentThreadIsInBackgroundNotice}>
            {canPromoteSidebar
              ? threadSettingsNotificationsCopy.PARENT_THREAD_IS_BACKGROUND_CAN_PROMOTE
              : threadSettingsNotificationsCopy.PARENT_THREAD_IS_BACKGROUND_CAN_NOT_PROMOTE}
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
