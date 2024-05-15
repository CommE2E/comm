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

type KeyserverCheckStatus =
  | { +status: 'inactive' }
  | { +status: 'loading' }
  | { +status: 'error' };
const keyserverCheckStatusInactive = { status: 'inactive' };
const keyserverCheckStatusLoading = { status: 'loading' };
const keyserverCheckStatusError = { status: 'error' };

function AddKeyserverModal(): React.Node {
  const { popModal } = useModalContext();

  const dispatch = useDispatch();

  const staffCanSee = useStaffCanSee();

  const currentUserID = useSelector(state => state.currentUserInfo?.id);
  const customServer = useSelector(state => state.customServer);

  const [keyserverURL, setKeyserverURL] = React.useState<string>(
    customServer && staffCanSee ? customServer : '',
  );
  const [status, setStatus] = React.useState<KeyserverCheckStatus>(
    keyserverCheckStatusInactive,
  );

  const onChangeKeyserverURL = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) =>
      setKeyserverURL(event.currentTarget.value),
    [],
  );

  const isKeyserverURLValidCallback = useIsKeyserverURLValid(keyserverURL);

  const onClickAddKeyserver = React.useCallback(async () => {
    if (!currentUserID || !keyserverURL) {
      return;
    }
    setStatus(keyserverCheckStatusLoading);

    const keyserverVersionData = await isKeyserverURLValidCallback();
    if (!keyserverVersionData) {
      setStatus(keyserverCheckStatusError);
      return;
    }
    setStatus(keyserverCheckStatusInactive);

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

  const showErrorMessage = status.status === 'error';
  const errorMessage = React.useMemo(() => {
    let errorText;
    if (showErrorMessage) {
      errorText =
        'Cannot connect to keyserver. Please check the URL or your ' +
        'connection and try again.';
    }
    return <div className={css.errorMessage}>{errorText}</div>;
  }, [showErrorMessage]);

  const buttonDisabled = !keyserverURL || status.status === 'loading';
  const addKeyserverButton = React.useMemo(
    () => (
      <Button
        variant="filled"
        buttonColor={buttonThemes.primary}
        className={css.button}
        onClick={onClickAddKeyserver}
        disabled={buttonDisabled}
      >
        Add keyserver
      </Button>
    ),
    [buttonDisabled, onClickAddKeyserver],
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
