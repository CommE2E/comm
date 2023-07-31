// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { communityOrThreadNoun } from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadTypeIsCommunityRoot } from 'lib/types/thread-types-enum.js';

import css from './thread-settings-delete-confirmation-modal.css';
import Button from '../../../components/button.react.js';
import Modal from '../../modal.react.js';

type BaseProps = {
  +threadInfo: ThreadInfo,
  +onConfirmation: () => mixed,
};

function ThreadDeleteConfirmationModal({
  threadInfo,
  onConfirmation,
}: BaseProps): React.Node {
  const { popModal } = useModalContext();
  const threadsToDeleteText = React.useMemo(
    () =>
      `${
        threadTypeIsCommunityRoot(threadInfo.type)
          ? 'Subchannels and threads'
          : 'Threads'
      } within this ${communityOrThreadNoun(threadInfo)}`,
    [threadInfo],
  );

  return (
    <Modal
      size="large"
      name="Warning"
      icon="warning-circle"
      withCloseButton={false}
      onClose={popModal}
    >
      <div className={css.container}>
        <p className={css.text}>
          {threadsToDeleteText} will also be permanently deleted. Are you sure
          you want to continue?
        </p>
        <div className={css.buttonContainer}>
          <Button variant="outline" onClick={popModal}>
            No
          </Button>
          <Button variant="filled" onClick={onConfirmation} type="submit">
            Yes
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ThreadDeleteConfirmationModal;
