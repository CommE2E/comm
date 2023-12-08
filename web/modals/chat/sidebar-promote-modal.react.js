// @flow

import * as React from 'react';

import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import css from './sidebar-promote-modal.css';
import Button from '../../components/button.react.js';
import Modal from '../modal.react.js';

type Props = {
  +onClose: () => void,
  +onConfirm: () => void,
  +threadInfo: ThreadInfo,
};

function SidebarPromoteModal(props: Props): React.Node {
  const { threadInfo, onClose, onConfirm } = props;
  const { uiName } = useResolvedThreadInfo(threadInfo);

  const handleConfirm = React.useCallback(() => {
    onConfirm();
    onClose();
  }, [onClose, onConfirm]);

  const primaryButton = React.useMemo(
    () => (
      <Button onClick={handleConfirm} type="submit" variant="filled">
        Promote to channel
      </Button>
    ),
    [handleConfirm],
  );

  const secondaryButton = React.useMemo(
    () => (
      <Button onClick={onClose} type="submit" variant="outline">
        Cancel
      </Button>
    ),
    [onClose],
  );

  return (
    <Modal
      size="large"
      name="Promote to channel"
      icon="warning-circle"
      onClose={onClose}
      primaryButton={primaryButton}
      secondaryButton={secondaryButton}
    >
      <div className={css.modalBody}>
        Are you sure you want to promote &ldquo;{uiName}&rdquo;? Promoting a
        thread to a channel cannot be undone.
      </div>
    </Modal>
  );
}

export default SidebarPromoteModal;
