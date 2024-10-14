// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  toggleMessagePinActionTypes,
  useToggleMessagePin,
} from 'lib/actions/message-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { chatMessageItemEngagementTargetMessageInfo } from 'lib/shared/chat-message-item-utils.js';
import { modifyItemForResultScreen } from 'lib/shared/message-utils.js';
import type { RawMessageInfo } from 'lib/types/message-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import css from './toggle-pin-modal.css';
import Button, { buttonThemes } from '../../components/button.react.js';
import MessageResult from '../../components/message-result.react.js';
import Modal from '../modal.react.js';

type TogglePinModalProps = {
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
};

function TogglePinModal(props: TogglePinModalProps): React.Node {
  const { item, threadInfo } = props;
  const { isPinned } = item;
  const { popModal } = useModalContext();

  const callToggleMessagePin = useToggleMessagePin();
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
    if (item.messageInfoType !== 'composable') {
      return item;
    }

    const strippedItem = {
      ...item,
      threadCreatedFromMessage: undefined,
      reactions: {},
    };
    return modifyItemForResultScreen(strippedItem);
  }, [item]);

  const engagementTargetMessageInfo =
    chatMessageItemEngagementTargetMessageInfo(item);
  const engagementTargetMessageID = engagementTargetMessageInfo?.id;
  const onClick = React.useCallback(() => {
    const createToggleMessagePinPromise = async () => {
      invariant(
        engagementTargetMessageID,
        'engagement target messageID should be defined',
      );
      const result = await callToggleMessagePin({
        messageID: engagementTargetMessageID,
        action: modalInfo.action,
      });
      return ({
        newMessageInfos: result.newMessageInfos,
        threadID: result.threadID,
      }: {
        +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
        +threadID: string,
      });
    };

    void dispatchActionPromise(
      toggleMessagePinActionTypes,
      createToggleMessagePinPromise(),
    );
    popModal();
  }, [
    modalInfo,
    callToggleMessagePin,
    dispatchActionPromise,
    engagementTargetMessageID,
    popModal,
  ]);

  const primaryButton = React.useMemo(
    () => (
      <Button
        variant="filled"
        buttonColor={modalInfo.buttonColor}
        onClick={onClick}
      >
        {modalInfo.buttonText}
      </Button>
    ),
    [modalInfo.buttonColor, modalInfo.buttonText, onClick],
  );

  const secondaryButton = React.useMemo(
    () => (
      <Button variant="outline" onClick={popModal}>
        Cancel
      </Button>
    ),
    [popModal],
  );

  return (
    <Modal
      name={modalInfo.name}
      onClose={popModal}
      size="large"
      primaryButton={primaryButton}
      secondaryButton={secondaryButton}
    >
      <div className={css.confirmationText}>{modalInfo.confirmationText}</div>
      <MessageResult
        item={modifiedItem}
        threadInfo={threadInfo}
        scrollable={true}
      />
    </Modal>
  );
}

export default TogglePinModal;
