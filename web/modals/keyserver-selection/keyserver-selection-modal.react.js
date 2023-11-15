// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { KeyserverInfo } from 'lib/types/keyserver-types.js';
import type { GlobalAccountUserInfo } from 'lib/types/user-types.js';

import css from './keyserver-selection-modal.css';
import Button, { buttonThemes } from '../../components/button.react.js';
import KeyserverPill from '../../components/keyserver-pill.react.js';
import StatusIndicator from '../../components/status-indicator.react.js';
import Modal from '../modal.react.js';

type Props = {
  +keyserverAdminUserInfo: GlobalAccountUserInfo,
  +keyserverInfo: KeyserverInfo,
};

function KeyserverSelectionModal(props: Props): React.Node {
  const { keyserverAdminUserInfo, keyserverInfo } = props;

  const { popModal } = useModalContext();

  return (
    <Modal size="large" onClose={popModal} name="Keyserver details">
      <div className={css.container}>
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
          <div>
            You may delete offline keyserver from your keyserver list. When you
            delete a keyserver, you will still remain in the associated
            communities.
          </div>
          <div>
            Any messages or content you have previously sent will remain on the
            keyserver&rsquo;s communities after disconnecting or deleting.
          </div>
        </div>
      </div>
      <div className={css.buttonContainer}>
        <Button
          variant="filled"
          buttonColor={buttonThemes.danger}
          className={css.button}
        >
          Delete keyserver from list
        </Button>
      </div>
    </Modal>
  );
}

export default KeyserverSelectionModal;
