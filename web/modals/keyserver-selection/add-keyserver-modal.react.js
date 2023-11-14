// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import css from './add-keyserver-modal.css';
import Button, { buttonThemes } from '../../components/button.react.js';
import Input from '../input.react.js';
import Modal from '../modal.react.js';

function AddKeyserverModal(): React.Node {
  const { popModal } = useModalContext();

  const [keyserverURL, setKeyserverURL] = React.useState<string>('');

  const onChangeKeyserverURL = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) => {
      setKeyserverURL(event.currentTarget.value);
    },
    [],
  );

  const onClickAddKeyserver = React.useCallback(() => {
    // TODO
  }, []);

  const addKeyserverModal = React.useMemo(
    () => (
      <Modal size="large" onClose={popModal} name="Add keyserver">
        <div className={css.container}>
          <div className={css.inputTitle}>Keyserver URL</div>
          <Input
            type="text"
            value={keyserverURL}
            onChange={onChangeKeyserverURL}
            placeholder="Keyserver URL"
          />
        </div>
        <div className={css.buttonContainer}>
          <Button
            variant="filled"
            buttonColor={buttonThemes.primary}
            className={css.button}
            onClick={onClickAddKeyserver}
          >
            Add keyserver
          </Button>
        </div>
      </Modal>
    ),
    [keyserverURL, onChangeKeyserverURL, onClickAddKeyserver, popModal],
  );

  return addKeyserverModal;
}

export default AddKeyserverModal;
