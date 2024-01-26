// @flow

import * as React from 'react';

import { setCustomServerActionType } from 'lib/actions/custom-server-actions.js';
import { removeKeyserverActionType } from 'lib/actions/keyserver-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { KeyserverInfo } from 'lib/types/keyserver-types.js';
import type { GlobalAccountUserInfo } from 'lib/types/user-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import css from './keyserver-selection-modal.css';
import Button, { buttonThemes } from '../../components/button.react.js';
import KeyserverPill from '../../components/keyserver-pill.react.js';
import StatusIndicator from '../../components/status-indicator.react.js';
import { useStaffCanSee } from '../../utils/staff-utils.js';
import Alert from '../alert.react.js';
import ConfirmationAlert from '../confirmation-alert.react.js';
import Modal from '../modal.react.js';

type Props = {
  +keyserverAdminUserInfo: GlobalAccountUserInfo,
  +keyserverInfo: KeyserverInfo,
};

function KeyserverSelectionModal(props: Props): React.Node {
  const { keyserverAdminUserInfo, keyserverInfo } = props;

  const { popModal, pushModal, clearModals } = useModalContext();

  const onClickDisconnectKeyserver = React.useCallback(
    () =>
      // TODO: update this function when we have a way to
      // disconnect from a keyserver
      pushModal(
        <Alert title="Feature not ready">
          Disconnecting from a keyserver is still not ready. Please come back
          later.
        </Alert>,
      ),
    [pushModal],
  );

  const staffCanSee = useStaffCanSee();

  const dispatch = useDispatch();

  const onDeleteKeyserver = React.useCallback(() => {
    dispatch({
      type: removeKeyserverActionType,
      payload: {
        keyserverAdminUserID: keyserverAdminUserInfo.id,
      },
    });

    if (staffCanSee) {
      dispatch({
        type: setCustomServerActionType,
        payload: keyserverInfo.urlPrefix,
      });
    }

    clearModals();
  }, [
    clearModals,
    dispatch,
    keyserverAdminUserInfo.id,
    keyserverInfo.urlPrefix,
    staffCanSee,
  ]);

  const onClickRemoveKeyserver = React.useCallback(
    () =>
      pushModal(
        <ConfirmationAlert
          title="Confirm deletion"
          confirmationButtonContent="Delete"
          onConfirm={onDeleteKeyserver}
          isDestructive
        >
          <div className={css.keyserverRemoveConfirmationContainer}>
            <div>
              Are you sure you want to delete this keyserver from your keyserver
              list?
            </div>
            <div>You will still remain in the associated communities.</div>
          </div>
        </ConfirmationAlert>,
      ),
    [onDeleteKeyserver, pushModal],
  );

  const { keyerverRemoveInfoText, keyserverRemoveButton } =
    React.useMemo(() => {
      if (keyserverInfo.connection.status !== 'connected') {
        const removeInfoText = (
          <>
            <div>
              You may delete an offline keyserver from your keyserver list. When
              you delete a keyserver, you will still remain in the associated
              communities.
            </div>
            <div>
              Any messages or content you have previously sent will remain on
              the keyserver&rsquo;s communities after disconnecting or deleting.
            </div>
          </>
        );

        const removeButton = (
          <Button
            variant="filled"
            buttonColor={buttonThemes.danger}
            className={css.button}
            onClick={onClickRemoveKeyserver}
          >
            Delete keyserver from list
          </Button>
        );

        return {
          keyerverRemoveInfoText: removeInfoText,
          keyserverRemoveButton: removeButton,
        };
      }
      const removeInfoText = (
        <>
          <div>
            Disconnecting from this keyserver will remove you from its
            associated communities.
          </div>
          <div>
            Any messages or content you have previously sent will remain on the
            keyserver.
          </div>
        </>
      );

      const removeButton = (
        <Button
          variant="filled"
          buttonColor={buttonThemes.danger}
          className={css.button}
          onClick={onClickDisconnectKeyserver}
        >
          Disconnect keyserver
        </Button>
      );

      return {
        keyerverRemoveInfoText: removeInfoText,
        keyserverRemoveButton: removeButton,
      };
    }, [
      keyserverInfo.connection.status,
      onClickDisconnectKeyserver,
      onClickRemoveKeyserver,
    ]);

  return (
    <Modal
      size="large"
      onClose={popModal}
      name="Keyserver details"
      primaryButton={keyserverRemoveButton}
    >
      <>
        <div className={css.keyserverDetailsContainer}>
          <div className={css.keyserverDetailsHeaderContainer}>
            <KeyserverPill
              keyserverAdminUsername={keyserverAdminUserInfo.username}
            />
            <StatusIndicator connectionInfo={keyserverInfo.connection} />
          </div>
          <div className={css.keyserverURL}>{keyserverInfo.urlPrefix}</div>
        </div>
        <div className={css.keyserverRemoveTextContainer}>
          {keyerverRemoveInfoText}
        </div>
      </>
    </Modal>
  );
}

export default KeyserverSelectionModal;
