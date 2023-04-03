// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  toggleMessagePin,
  toggleMessagePinActionTypes,
} from 'lib/actions/thread-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import css from './toggle-pin-modal.css';
import Button, { buttonThemes } from '../../components/button.react.js';
import PinnedMessage from '../../components/pinned-message.react.js';
import Modal from '../modal.react.js';

type TogglePinModalProps = {
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
};

function TogglePinModal(props: TogglePinModalProps): React.Node {
  const { item, threadInfo } = props;
  const { messageInfo, isPinned } = item;
  const { popModal } = useModalContext();

  const callToggleMessagePin = useServerCall(toggleMessagePin);
  const dispatchActionPromise = useDispatchActionPromise();

  const modalInfo = React.useMemo(() => {
    if (isPinned) {
      return {
        name: 'Remove Pinned Message',
        action: 'unpin',
        confirmationText:
          'Are you sure you want to remove this pinned message?',
        buttonText: 'Remove Pinned Message',
        buttonColor: buttonThemes.danger,
      };
    }

    return {
      name: 'Pin Message',
      action: 'pin',
      confirmationText: `You may pin this message to the channel 
        you are currently viewing. To unpin a message, select the pinned 
        messages icon in the channel.`,
      buttonText: 'Pin Message',
      buttonColor: buttonThemes.standard,
    };
  }, [isPinned]);

  // We want to remove inline engagement (threadCreatedFromMessage / reactions)
  // and the message header (startsConversation). We also want to set isViewer
  // to false so that the message is left-aligned and uncolored.
  const modifiedItem = React.useMemo(() => {
    if (item.messageInfoType === 'composable') {
      return {
        ...item,
        threadCreatedFromMessage: undefined,
        reactions: {},
        startsConversation: false,
        messageInfo: {
          ...item.messageInfo,
          creator: {
            ...item.messageInfo.creator,
            isViewer: false,
          },
        },
      };
    } else {
      return item;
    }
  }, [item]);

  const onClick = React.useCallback(() => {
    const createToggleMessagePinPromise = async () => {
      invariant(messageInfo.id, 'messageInfo.id should be defined');
      const result = await callToggleMessagePin({
        messageID: messageInfo.id,
        action: modalInfo.action,
      });
      return {
        newMessageInfos: result.newMessageInfos,
        threadID: result.threadID,
      };
    };

    dispatchActionPromise(
      toggleMessagePinActionTypes,
      createToggleMessagePinPromise(),
    );
    popModal();
  }, [
    modalInfo,
    callToggleMessagePin,
    dispatchActionPromise,
    messageInfo.id,
    popModal,
  ]);

  return (
    <Modal name={modalInfo.name} onClose={popModal} size="large">
      <div className={css.confirmationText}>{modalInfo.confirmationText}</div>
      <PinnedMessage item={modifiedItem} threadInfo={threadInfo} />
      <div className={css.buttonContainer}>
        <Button
          variant="filled"
          buttonColor={modalInfo.buttonColor}
          onClick={onClick}
        >
          {modalInfo.buttonText}
        </Button>
        <div className={css.cancelButton} onClick={popModal}>
          Cancel
        </div>
      </div>
    </Modal>
  );
}

export default TogglePinModal;
