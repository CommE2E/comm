// @flow

import * as React from 'react';

import { threadInfoSelector } from 'lib/selectors/thread-selectors';

import Button from '../../../components/button.react';
import { useSelector } from '../../../redux/redux-utils';
import SWMansionIcon from '../../../SWMansionIcon.react';
import Modal from '../../modal.react';
import css from './notifications-modal.css';
import NotificationsOption from './notifications-option.react';

type Props = {
  +threadID: string,
  +onClose: () => void,
};

type NotificationSettings = 'focused' | 'badge-only' | 'background';

function NotificationsModal(props: Props): React.Node {
  const { onClose, threadID } = props;
  const threadInfo = useSelector(state => threadInfoSelector(state)[threadID]);
  const { subscription } = threadInfo.currentUser;

  const threadOriginalSetting = React.useMemo((): NotificationSettings => {
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
  ] = React.useState<NotificationSettings>(threadOriginalSetting);

  const notificationIconStyle = React.useMemo(() => ({ width: 'auto' }), []);

  const focusedItem = React.useMemo(() => {
    const description = [
      ['Banner notifs', true],
      ['Badge count', true],
      ['Lives in Focused tab', true],
    ];
    const icon = (
      <SWMansionIcon
        icon="all-notifs"
        size={86}
        style={notificationIconStyle}
      />
    );
    return (
      <NotificationsOption
        active={notificationSettings === 'focused'}
        title="Focused (enabled)"
        description={description}
        icon={icon}
        onSelect={() => setNotificationSettings('focused')}
      ></NotificationsOption>
    );
  }, [notificationIconStyle, notificationSettings]);

  const focusedBadgeOnlyItem = React.useMemo(() => {
    const description = [
      ['Banner notifs', false],
      ['Badge count', true],
      ['Lives in Focused tab', true],
    ];
    const icon = (
      <SWMansionIcon
        icon="badge-notifs"
        size={86}
        style={notificationIconStyle}
      />
    );
    return (
      <NotificationsOption
        active={notificationSettings === 'badge-only'}
        title="Focused (badge only)"
        description={description}
        icon={icon}
        onSelect={() => setNotificationSettings('badge-only')}
      ></NotificationsOption>
    );
  }, [notificationIconStyle, notificationSettings]);

  const backgroundItem = React.useMemo(() => {
    const description = [
      ['Banner notifs', false],
      ['Badge count', false],
      ['Lives in Backgound tab', true],
    ];
    const icon = (
      <SWMansionIcon
        icon="muted-notifs"
        size={86}
        style={notificationIconStyle}
      />
    );
    return (
      <NotificationsOption
        active={notificationSettings === 'background'}
        title="Background"
        description={description}
        icon={icon}
        onSelect={() => setNotificationSettings('background')}
      ></NotificationsOption>
    );
  }, [notificationIconStyle, notificationSettings]);

  const onClickSave = React.useCallback(() => {}, []);
  return (
    <Modal name="Channel notifications" size="fit-content" onClose={onClose}>
      <div className={css.container}>
        <div className={css.optionsContainer}>
          {focusedItem}
          {focusedBadgeOnlyItem}
          {backgroundItem}
        </div>
        <Button
          type="primary"
          onClick={onClickSave}
          disabled={notificationSettings === threadOriginalSetting}
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}

export default NotificationsModal;
