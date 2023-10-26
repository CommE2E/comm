// @flow

import * as React from 'react';

import type { TunnelbrokerSocketListener } from 'lib/tunnelbroker/tunnelbroker-context.js';
import type { TunnelbrokerMessage } from 'lib/types/tunnelbroker/messages.js';

import css from './tunnelbroker-message-list.css';
import Modal from '../modals/modal.react.js';

type Props = {
  +addListener: (listener: TunnelbrokerSocketListener) => void,
  +onClose: () => void,
};

function TunnelbrokerMessagesScreen(props: Props): React.Node {
  const { addListener, onClose } = props;
  const [messages, setMessages] = React.useState<TunnelbrokerMessage[]>([]);

  React.useEffect(() => {
    addListener(msg => {
      setMessages(prev => [...prev, msg]);
    });
  }, [addListener]);

  return (
    <Modal name="Tunnelbroker Messages" onClose={onClose} size="large">
      <div className={css.messageList}>
        {messages.length ? (
          messages.map(message => (
            <div key={message.messageID} className={css.messageRow}>
              <div className={css.messageCol}>{JSON.stringify(message)}</div>
            </div>
          ))
        ) : (
          <div className={css.messageRow}>
            <div className={css.messageCol}>No messages</div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default TunnelbrokerMessagesScreen;
