// @flow

import * as React from 'react';

import type { TunnelbrokerSocketListener } from 'lib/tunnelbroker/tunnelbroker-context.js';
import {
  type TunnelbrokerToDeviceMessage,
  tunnelbrokerToDeviceMessageTypes,
} from 'lib/types/tunnelbroker/messages.js';

import css from './tunnelbroker-message-list.css';
import Modal from '../modals/modal.react.js';

type Props = {
  +addListener: (listener: TunnelbrokerSocketListener) => void,
  +removeListener: (listener: TunnelbrokerSocketListener) => void,
  +onClose: () => void,
};

function TunnelbrokerMessagesScreen(props: Props): React.Node {
  const { addListener, onClose, removeListener } = props;
  const [messages, setMessages] = React.useState<TunnelbrokerToDeviceMessage[]>(
    [],
  );

  const listener = React.useCallback((msg: TunnelbrokerToDeviceMessage) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  React.useEffect(() => {
    addListener(listener);
    return () => removeListener(listener);
  }, [addListener, listener, removeListener]);

  let messageList: React.Node = (
    <div className={css.messageRow}>
      <div className={css.messageCol}>No messages</div>
    </div>
  );
  if (messages.length) {
    messageList = messages
      .filter(
        message => message.type !== tunnelbrokerToDeviceMessageTypes.HEARTBEAT,
      )
      .map((message, id) => (
        <div key={id} className={css.messageRow}>
          <div className={css.messageCol}>{JSON.stringify(message)}</div>
        </div>
      ));
  }

  return (
    <Modal name="Tunnelbroker Messages" onClose={onClose} size="large">
      <div className={css.messageList}>{messageList}</div>
    </Modal>
  );
}

export default TunnelbrokerMessagesScreen;
