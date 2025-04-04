// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { useDeleteMessage } from 'lib/utils/delete-message-utils.js';

import css from './delete-message-modal.css';
import Button, { buttonThemes } from '../../components/button.react.js';
import MessageResult from '../../components/message-result.react.js';
import Modal from '../modal.react.js';

type Props = {
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
};

function DeleteMessageModal(props: Props): React.Node {
  const { item, threadInfo } = props;
  const { popModal } = useModalContext();
  const deleteMessage = useDeleteMessage();

  const onClickDelete = React.useCallback(() => {
    if (item.messageInfo) {
      void deleteMessage(item.messageInfo);
    }
    popModal();
  }, [deleteMessage, item.messageInfo, popModal]);

  const primaryButton = React.useMemo(
    () => (
      <Button
        variant="filled"
        buttonColor={buttonThemes.danger}
        onClick={onClickDelete}
      >
        Delete
      </Button>
    ),
    [onClickDelete],
  );

  const secondaryButton = React.useMemo(
    () => (
      <Button variant="outline" onClick={popModal}>
        Cancel
      </Button>
    ),
    [popModal],
  );

  const modifiedItem = React.useMemo(
    () => ({
      ...item,
      startsConversation: false,
      startsCluster: false,
      endsCluster: false,
    }),
    [item],
  );

  return (
    <Modal
      name="Delete Message"
      onClose={popModal}
      size="large"
      primaryButton={primaryButton}
      secondaryButton={secondaryButton}
    >
      <div className={css.confirmationText}>
        Are you sure you want to delete this message? This action cannot be
        undone.
      </div>
      <MessageResult
        item={modifiedItem}
        threadInfo={threadInfo}
        scrollable={true}
      />
    </Modal>
  );
}

export { DeleteMessageModal };
