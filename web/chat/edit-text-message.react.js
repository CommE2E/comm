// @flow

import * as React from 'react';
import { XCircle as XCircleIcon } from 'react-feather';

import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { useEditMessage } from 'lib/shared/edit-messages-utils.js';
import { trimMessage } from 'lib/shared/message-utils.js';
import type { SendEditMessageResult } from 'lib/types/message-types.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';

import cssInputBar from './chat-input-bar.css';
import ChatInputTextArea from './chat-input-text-area.react.js';
import ComposedMessage from './composed-message.react.js';
import { useEditModalContext } from './edit-message-provider.js';
import type { EditState } from './edit-message-provider.js';
import css from './edit-text-message.css';
import type { ButtonColor } from '../components/button.react.js';
import Button from '../components/button.react.js';

type BaseProps = {
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
  +background: boolean,
  +width: ?number,
};

type Props = {
  ...BaseProps,
  +editState: ?EditState,
  +clearEditModal: () => void,
  +editMessage: (
    messageID: string,
    text: string,
  ) => Promise<SendEditMessageResult>,
  +setError: boolean => void,
  +setDraft: string => void,
};

function EditTextMessage(props: Props): React.Node {
  const {
    editState,
    background,
    clearEditModal,
    threadInfo,
    setDraft,
    item,
    editMessage,
    setError,
  } = props;

  const editedMessageDraft = editState?.editedMessageDraft ?? '';
  const threadColor = threadInfo.color;
  const buttonColor: ButtonColor = {
    backgroundColor: `#${threadColor}`,
  };

  const isMessageEdited = React.useMemo(() => {
    const { messageInfo } = item;
    if (!messageInfo || !messageInfo.text || !editState) {
      return false;
    }
    if (!editedMessageDraft) {
      return false;
    }
    const trimmedDraft = trimMessage(editedMessageDraft);
    return trimmedDraft !== messageInfo.text;
  }, [editState, editedMessageDraft, item]);

  const checkAndEdit = async () => {
    const { id: messageInfoID } = item.messageInfo;
    if (!isMessageEdited) {
      clearEditModal();
      return;
    }
    if (!messageInfoID || !editState?.editedMessageDraft) {
      return;
    }
    try {
      await editMessage(messageInfoID, editState.editedMessageDraft);
      clearEditModal();
    } catch (e) {
      setError(true);
    }
  };

  let editFailed;
  if (editState?.isError) {
    editFailed = (
      <div className={css.failedText}>
        <div className={css.iconContainer}>
          <XCircleIcon />
        </div>
        <div className={css.errorColor}>Edit failed.</div>
        <div className={css.whiteColor}>Please try again.</div>
      </div>
    );
  }

  return (
    <div className={css.editMessage} style={{ width: props.width }}>
      <div className={cssInputBar.inputBarTextInput}>
        <ChatInputTextArea
          focus={!background}
          currentText={editedMessageDraft}
          setCurrentText={setDraft}
          send={checkAndEdit}
        />
      </div>
      <div className={css.bottomRow}>
        {editFailed}
        <div className={css.buttons}>
          <Button
            className={css.saveButton}
            buttonColor={buttonColor}
            onClick={checkAndEdit}
          >
            Save (enter)
          </Button>
          <Button onClick={clearEditModal}>Cancel (esc)</Button>
        </div>
      </div>
    </div>
  );
}

const ConnectedEditTextMessage: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedEditTextMessage(props) {
    const { editState, clearEditModal, setError, setDraft } =
      useEditModalContext();
    const editMessage = useEditMessage();
    return (
      <EditTextMessage
        {...props}
        editState={editState}
        clearEditModal={clearEditModal}
        editMessage={editMessage}
        setError={setError}
        setDraft={setDraft}
      />
    );
  });

const ComposedEditTextMessage: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ComposedEditTextMessage(props) {
    const { background, width, ...restProps } = props;
    return (
      <ComposedMessage
        {...restProps}
        sendFailed={false}
        shouldDisplayPinIndicator={false}
      >
        <ConnectedEditTextMessage {...props} />
      </ComposedMessage>
    );
  });

export { ConnectedEditTextMessage, ComposedEditTextMessage };
