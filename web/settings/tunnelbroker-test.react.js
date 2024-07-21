// @flow

import invariant from 'invariant';
import * as React from 'react';

import { type TunnelbrokerClientMessageToDevice } from 'lib/tunnelbroker/tunnelbroker-context.js';
import {
  type EncryptedMessage,
  peerToPeerMessageTypes,
} from 'lib/types/tunnelbroker/peer-to-peer-message-types.js';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';

import css from './tunnelbroker-test.css';
import Button from '../components/button.react.js';
import { olmAPI } from '../crypto/olm-api.js';
import Input from '../modals/input.react.js';
import Modal from '../modals/modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +sendMessage: (message: TunnelbrokerClientMessageToDevice) => Promise<void>,
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

  const currentUserID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

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

  const onSubmitEncrypted = React.useCallback(
    async (event: SyntheticEvent<HTMLButtonElement>) => {
      event.preventDefault();

      if (!currentUserID) {
        return;
      }

      setLoading(true);
      try {
        await olmAPI.initializeCryptoAccount();
        const encryptedData = await olmAPI.encrypt(message, recipient);
        const deviceID = await getContentSigningKey();
        const encryptedMessage: EncryptedMessage = {
          type: peerToPeerMessageTypes.ENCRYPTED_MESSAGE,
          senderInfo: {
            deviceID,
            userID: currentUserID,
          },
          encryptedData,
        };
        await sendMessage({
          deviceID: recipient,
          payload: JSON.stringify(encryptedMessage),
        });
      } catch (e) {
        setErrorMessage(e.message);
      }
      setLoading(false);
    },
    [message, currentUserID, recipient, sendMessage],
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
        <div className={css.footer}>
          <Button
            type="submit"
            variant="filled"
            onClick={onSubmitEncrypted}
            disabled={!recipient || loading}
          >
            Send Encrypted Message
          </Button>
          {errorMsg}
        </div>
      </div>
    </Modal>
  );
}

export default TunnelbrokerTestScreen;
