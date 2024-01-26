// @flow

import * as React from 'react';

import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import css from './confirm-leave-thread-modal.css';
import Button, { buttonThemes } from '../../components/button.react.js';
import Modal from '../modal.react.js';

type Props = {
  +threadInfo: ThreadInfo,
  +onClose: () => void,
  +onConfirm: () => void,
};
function ConfirmLeaveThreadModal(props: Props): React.Node {
  const { threadInfo, onClose, onConfirm } = props;
  const { uiName } = useResolvedThreadInfo(threadInfo);

  const primaryButton = React.useMemo(
    () => (
      <Button
        onClick={onConfirm}
        type="submit"
        variant="filled"
        buttonColor={buttonThemes.danger}
      >
        Yes, leave chat
      </Button>
    ),
    [onConfirm],
  );

  const secondaryButton = React.useMemo(
    () => (
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
    ),
    [onClose],
  );

  return (
    <Modal
      size="fit-content"
      name="Leaving channel"
      icon="warning-circle"
      withCloseButton={false}
      onClose={onClose}
      primaryButton={primaryButton}
      secondaryButton={secondaryButton}
    >
      <div className={css.container}>
        Are you sure you want to leave &ldquo;{uiName}&rdquo;?
      </div>
    </Modal>
  );
}

export default ConfirmLeaveThreadModal;
