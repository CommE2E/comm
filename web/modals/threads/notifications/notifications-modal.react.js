// @flow

import * as React from 'react';

import { threadInfoSelector } from 'lib/selectors/thread-selectors';

import Button from '../../../components/button.react';
import { useSelector } from '../../../redux/redux-utils';
import Modal from '../../modal.react';
import css from './notifications-modal.css';

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
    // eslint-disable-next-line no-unused-vars
    setNotificationSettings,
  ] = React.useState<NotificationSettings>(threadOriginalSetting);

  const onClickSave = React.useCallback(() => {}, []);
  const notificationOptions = [];

  return (
    <Modal name="Channel notifications" size="fit-content" onClose={onClose}>
      <div className={css.container}>
        <div className={css.optionsContainer}>{notificationOptions}</div>
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
