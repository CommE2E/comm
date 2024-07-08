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

const homeStatements = [
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
    statement: threadSettingsNotificationsCopy.IN_HOME_TAB,
    isStatementValid: true,
    styleStatementBasedOnValidity: true,
  },
];

const notifCountOnlyStatements = [
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
    statement: threadSettingsNotificationsCopy.IN_HOME_TAB,
    isStatementValid: true,
    styleStatementBasedOnValidity: true,
  },
];

const mutedStatements = [
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
    statement: threadSettingsNotificationsCopy.IN_MUTED_TAB,
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
    onHomeSelected,
    onNotifCountOnlySelected,
    onMutedSelected,
    saveButtonDisabled,
    onSave,
    isSidebar,
    canPromoteSidebar,
    parentThreadIsMuted,
  } = useThreadSettingsNotifications(threadInfo, onClose);

  const isHomeSelected = notificationSettings === 'home';
  const homeItem = React.useMemo(() => {
    const icon = <AllNotifsIllustration />;
    return (
      <EnumSettingsOption
        selected={isHomeSelected}
        title={threadSettingsNotificationsCopy.HOME}
        statements={homeStatements}
        icon={icon}
        onSelect={onHomeSelected}
      />
    );
  }, [isHomeSelected, onHomeSelected]);

  const isNotifyCountOnlySelected = notificationSettings === 'notif-count-only';
  const notifCountOnlyItem = React.useMemo(() => {
    const icon = <BadgeNotifsIllustration />;
    return (
      <EnumSettingsOption
        selected={isNotifyCountOnlySelected}
        title={threadSettingsNotificationsCopy.NOTIF_COUNT_ONLY}
        statements={notifCountOnlyStatements}
        icon={icon}
        onSelect={onNotifCountOnlySelected}
      />
    );
  }, [isNotifyCountOnlySelected, onNotifCountOnlySelected]);

  const isMutedSelected = notificationSettings === 'muted';
  const backgroundItem = React.useMemo(() => {
    const icon = <MutedNotifsIllustration />;
    return (
      <EnumSettingsOption
        selected={isMutedSelected}
        title={threadSettingsNotificationsCopy.MUTED}
        statements={mutedStatements}
        icon={icon}
        disabled={isSidebar}
        onSelect={onMutedSelected}
      />
    );
  }, [isMutedSelected, onMutedSelected, isSidebar]);

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
    if (parentThreadIsMuted) {
      return (
        <>
          <p className={css.parentThreadIsInBackgroundNotice}>
            {threadSettingsNotificationsCopy.PARENT_THREAD_IS_MUTED}
          </p>
          <p className={css.parentThreadIsInBackgroundNotice}>
            {canPromoteSidebar
              ? threadSettingsNotificationsCopy.PARENT_THREAD_IS_MUTED_CAN_PROMOTE
              : threadSettingsNotificationsCopy.PARENT_THREAD_IS_MUTED_CAN_NOT_PROMOTE}
          </p>
        </>
      );
    }

    return (
      <>
        <div className={css.optionsContainer}>
          {homeItem}
          {notifCountOnlyItem}
          {backgroundItem}
        </div>
        {noticeText}
      </>
    );
  }, [
    parentThreadIsMuted,
    homeItem,
    notifCountOnlyItem,
    backgroundItem,
    noticeText,
    canPromoteSidebar,
  ]);

  const saveButton = React.useMemo(() => {
    if (parentThreadIsMuted) {
      return undefined;
    }

    return (
      <Button variant="filled" onClick={onSave} disabled={saveButtonDisabled}>
        Save
      </Button>
    );
  }, [parentThreadIsMuted, onSave, saveButtonDisabled]);

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
