// @flow

import * as React from 'react';

import {
  updateSubscription,
  updateSubscriptionActionTypes,
} from 'lib/actions/user-actions';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import Button from '../../../components/button.react';
import { useSelector } from '../../../redux/redux-utils';
import SWMansionIcon from '../../../SWMansionIcon.react';
import Modal from '../../modal.react';
import css from './notifications-modal.css';
import NotificationsOption from './notifications-option.react';

type NotificationSettings = 'focused' | 'badge-only' | 'background';

type Props = {
  +threadID: string,
  +onClose: () => void,
};

function NotificationsModal(props: Props): React.Node {
  const { onClose, threadID } = props;
  const threadInfo = useSelector(state => threadInfoSelector(state)[threadID]);
  const { subscription } = threadInfo.currentUser;

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

  const notificationIconStyle = React.useMemo(() => ({ width: 'auto' }), []);

  const isFocusedSelected = notificationSettings === 'focused';
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
        selected={isFocusedSelected}
        title="Focused (enabled)"
        description={description}
        icon={icon}
        onSelect={() => setNotificationSettings('focused')}
      />
    );
  }, [isFocusedSelected, notificationIconStyle]);

  const isFocusedBadgeOnlySelected = notificationSettings === 'badge-only';
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
        selected={isFocusedBadgeOnlySelected}
        title="Focused (badge only)"
        description={description}
        icon={icon}
        onSelect={() => setNotificationSettings('badge-only')}
      />
    );
  }, [isFocusedBadgeOnlySelected, notificationIconStyle]);

  const isBackgroundSelected = notificationSettings === 'background';
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
        selected={isBackgroundSelected}
        title="Background"
        description={description}
        icon={icon}
        onSelect={() => setNotificationSettings('background')}
      />
    );
  }, [isBackgroundSelected, notificationIconStyle]);

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
          disabled={notificationSettings === initialThreadSetting}
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}

export default NotificationsModal;
