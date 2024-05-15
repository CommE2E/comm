// @flow

import * as React from 'react';

import { addKeyserverActionType } from 'lib/actions/keyserver-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useIsKeyserverURLValid } from 'lib/shared/keyserver-utils.js';
import type { KeyserverInfo } from 'lib/types/keyserver-types.js';
import { defaultKeyserverInfo } from 'lib/types/keyserver-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import css from './add-keyserver-modal.css';
import Button, { buttonThemes } from '../../components/button.react.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useStaffCanSee } from '../../utils/staff-utils.js';
import Input from '../input.react.js';
import Modal from '../modal.react.js';

function AddKeyserverModal(): React.Node {
  const { popModal } = useModalContext();

  const dispatch = useDispatch();

  const staffCanSee = useStaffCanSee();

  const currentUserID = useSelector(state => state.currentUserInfo?.id);
  const customServer = useSelector(state => state.customServer);

  const [keyserverURL, setKeyserverURL] = React.useState<string>(
    customServer && staffCanSee ? customServer : '',
  );
  const [showErrorMessage, setShowErrorMessage] =
    React.useState<boolean>(false);

  const onChangeKeyserverURL = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) =>
      setKeyserverURL(event.currentTarget.value),
    [],
  );

  const isKeyserverURLValidCallback = useIsKeyserverURLValid(keyserverURL);

  const onClickAddKeyserver = React.useCallback(async () => {
    setShowErrorMessage(false);
    if (!currentUserID || !keyserverURL) {
      return;
    }

    const keyserverVersionData = await isKeyserverURLValidCallback();
    if (!keyserverVersionData) {
      setShowErrorMessage(true);
      return;
    }

    const newKeyserverInfo: KeyserverInfo = defaultKeyserverInfo(keyserverURL);

    dispatch({
      type: addKeyserverActionType,
      payload: {
        keyserverAdminUserID: keyserverVersionData.ownerID,
        newKeyserverInfo,
      },
    });

    popModal();
  }, [
    currentUserID,
    dispatch,
    keyserverURL,
    popModal,
    isKeyserverURLValidCallback,
  ]);

  const errorMessage = React.useMemo(() => {
    let errorText;
    if (showErrorMessage) {
      errorText =
        'Cannot connect to keyserver. Please check the URL or your ' +
        'connection and try again.';
    }
    return <div className={css.errorMessage}>{errorText}</div>;
  }, [showErrorMessage]);

  const addKeyserverButton = React.useMemo(
    () => (
      <Button
        variant="filled"
        buttonColor={buttonThemes.primary}
        className={css.button}
        onClick={onClickAddKeyserver}
        disabled={!keyserverURL}
      >
        Add keyserver
      </Button>
    ),
    [keyserverURL, onClickAddKeyserver],
  );

  const addKeyserverModal = React.useMemo(
    () => (
      <Modal
        size="large"
        onClose={popModal}
        name="Add keyserver"
        primaryButton={addKeyserverButton}
      >
        <div className={css.container}>
          <div className={css.inputTitle}>Keyserver URL</div>
          <Input
            type="text"
            value={keyserverURL}
            onChange={onChangeKeyserverURL}
            placeholder="Keyserver URL"
          />
          {errorMessage}
        </div>
      </Modal>
    ),
    [
      addKeyserverButton,
      errorMessage,
      keyserverURL,
      onChangeKeyserverURL,
      popModal,
    ],
  );

  return addKeyserverModal;
}

export default AddKeyserverModal;
