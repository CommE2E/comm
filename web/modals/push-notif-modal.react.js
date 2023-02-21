// @flow
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import Modal from './modal.react.js';
import css from './push-notif-modal.css';
import Button from '../components/button.react.js';
import { useCreatePushSubscription } from '../push-notif/push-notifs-handler.js';

export function PushNotifModal(): React.Node {
  const { popModal } = useModalContext();

  const createPushSubscription = useCreatePushSubscription();

  const onEnable = React.useCallback(async () => {
    popModal();

    if (Notification.permission !== 'granted') {
      const permissionResult = await Notification.requestPermission();
      if (permissionResult !== 'granted') {
        return;
      }
    }

    await createPushSubscription();
  }, [createPushSubscription, popModal]);

  return (
    <Modal
      size="fit-content"
      name="Notifications"
      icon="bell"
      withCloseButton={false}
      onClose={popModal}
    >
      <div className={css.container}>
        <p className={css.text}>Would you like to enable push notifications?</p>
        <div className={css.buttonContainer}>
          <Button variant="outline" onClick={popModal}>
            No
          </Button>
          <Button variant="filled" onClick={onEnable} type="submit">
            Yes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
