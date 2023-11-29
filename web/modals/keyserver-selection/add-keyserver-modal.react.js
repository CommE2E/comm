// @flow

import * as React from 'react';

import { addKeyserverActionType } from 'lib/actions/keyserver-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { KeyserverInfo } from 'lib/types/keyserver-types.js';
import { defaultConnectionInfo } from 'lib/types/socket-types.js';
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

  const onChangeKeyserverURL = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) =>
      setKeyserverURL(event.currentTarget.value),
    [],
  );

  const onClickAddKeyserver = React.useCallback(() => {
    const newKeyserverInfo: KeyserverInfo = {
      cookie: null,
      updatesCurrentAsOf: 0,
      urlPrefix: keyserverURL,
      connection: defaultConnectionInfo,
      lastCommunicatedPlatformDetails: null,
      deviceToken: null,
    };

    dispatch({
      type: addKeyserverActionType,
      payload: {
        keyserverAdminUserID: currentUserID,
        newKeyserverInfo,
      },
    });

    popModal();
  }, [currentUserID, dispatch, keyserverURL, popModal]);

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
