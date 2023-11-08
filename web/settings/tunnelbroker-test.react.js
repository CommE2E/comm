// @flow

import invariant from 'invariant';
import * as React from 'react';

import { type ClientMessageToDevice } from 'lib/tunnelbroker/tunnelbroker-context.js';

import css from './tunnelbroker-test.css';
import Button from '../components/button.react.js';
import Input from '../modals/input.react.js';
import Modal from '../modals/modal.react.js';

type Props = {
  +sendMessage: (message: ClientMessageToDevice) => Promise<void>,
  +onClose: () => void,
};

function TunnelbrokerTestScreen(props: Props): React.Node {
  const { sendMessage, onClose } = props;
  const [recipient, setRecipient] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const recipientInput = React.useRef<?HTMLInputElement>(null);
  const messageInput = React.useRef<?HTMLInputElement>(null);

  const onSubmit = React.useCallback(
    async (event: SyntheticEvent<HTMLButtonElement>) => {
      event.preventDefault();

      setLoading(true);
      try {
        await sendMessage({ deviceID: recipient, payload: message });
      } catch (e) {
        setErrorMessage(e.message);
      }
      setLoading(false);
    },
    [message, recipient, sendMessage],
  );

  let errorMsg;
  if (errorMessage) {
    errorMsg = <div className={css.modalError}>{errorMessage}</div>;
  }

  return (
    <Modal name="Send Tunnelbroker Message" onClose={onClose} size="large">
      <div className={css.modalBody}>
        <div className={css.content}>
          <Input
            type="text"
            placeholder="deviceID"
            value={recipient}
            onChange={(event: SyntheticEvent<HTMLInputElement>) => {
              const target = event.target;
              invariant(target instanceof HTMLInputElement, 'target not input');
              setRecipient(target.value);
            }}
            disabled={loading}
            ref={recipientInput}
            label="Recipient"
          />
          <Input
            type="text"
            placeholder="payload"
            value={message}
            onChange={(event: SyntheticEvent<HTMLInputElement>) => {
              const target = event.target;
              invariant(target instanceof HTMLInputElement, 'target not input');
              setMessage(target.value);
            }}
            disabled={loading}
            ref={messageInput}
            label="Message"
          />
        </div>
        <div className={css.footer}>
          <Button
            type="submit"
            variant="filled"
            onClick={onSubmit}
            disabled={!recipient || !message || loading}
          >
            Send Message
          </Button>
          {errorMsg}
        </div>
      </div>
    </Modal>
  );
}

export default TunnelbrokerTestScreen;
