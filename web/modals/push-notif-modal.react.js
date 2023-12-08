// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import Modal from './modal.react.js';
import css from './push-notif-modal.css';
import Button from '../components/button.react.js';
import { useCreatePushSubscription } from '../push-notif/push-notifs-handler.js';

const PushNotifModal: React.ComponentType<{}> = React.memo(
  function PushNotifModal(): React.Node {
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

    const primaryButton = React.useMemo(
      () => (
        <Button variant="filled" onClick={onEnable} type="submit">
          Yes
        </Button>
      ),
      [onEnable],
    );

    const secondaryButton = React.useMemo(
      () => (
        <Button variant="outline" onClick={popModal}>
          No
        </Button>
      ),
      [popModal],
    );

    return (
      <Modal
        size="fit-content"
        name="Notifications"
        icon="bell"
        withCloseButton={false}
        onClose={popModal}
        primaryButton={primaryButton}
        secondaryButton={secondaryButton}
      >
        <div className={css.container}>
          Would you like to enable push notifications?
        </div>
      </Modal>
    );
  },
);

export default PushNotifModal;
