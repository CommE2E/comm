// @flow

import invariant from 'invariant';
import * as React from 'react';
import { XCircle as XCircleIcon } from 'react-feather';

import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { useEditMessage } from 'lib/shared/edit-messages-utils.js';
import { trimMessage } from 'lib/shared/message-utils.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import type { SendEditMessageResult } from 'lib/types/message-types.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';

import cssInputBar from './chat-input-bar.css';
import ChatInputTextArea from './chat-input-text-area.react.js';
import ComposedMessage from './composed-message.react.js';
import { useEditModalContext } from './edit-message-provider.js';
import type { EditState } from './edit-message-provider.js';
import css from './edit-text-message.css';

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
class EditTextMessage extends React.PureComponent<Props> {
  myRef: { current: null | HTMLDivElement };

  constructor(props: any) {
    super(props);
    this.myRef = React.createRef();
  }

  render() {
    invariant(
      this.props.item.messageInfo.type === messageTypes.TEXT,
      'EditTextMessage should only be used for messageTypes.TEXT',
    );
    invariant(this.props.editState, 'editState should be set');

    const editedMessageDraft = this.props.editState?.editedMessageDraft ?? '';
    const threadColor = this.props.threadInfo.color;
    const messageStyle = {
      backgroundColor: `#${threadColor}`,
    };

    let editFailed;
    if (this.props.editState?.isError) {
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
      <div
        className={css.editMessage}
        ref={this.myRef}
        style={{ width: this.props.width }}
      >
        <div className={cssInputBar.inputBarTextInput}>
          <ChatInputTextArea
            send={this.editMessage}
            focus={!this.props.background}
            currentText={editedMessageDraft}
            setCurrentText={this.props.setDraft}
          />
        </div>
        <div className={css.bottomRow}>
          {editFailed}
          <div className={css.buttons}>
            <button onClick={this.exitEditMode}>Cancel (esc)</button>
            <button
              className={css.saveButton}
              style={messageStyle}
              onClick={this.editMessage}
            >
              Save (enter)
            </button>
          </div>
        </div>
      </div>
    );
  }

  isMessageEdited = () => {
    const { messageInfo } = this.props.item;
    if (!messageInfo || !messageInfo.text || !this.props.editState) {
      return false;
    }
    const { editedMessageDraft } = this.props.editState;
    if (!editedMessageDraft) {
      return false;
    }
    const trimmedDraft = trimMessage(editedMessageDraft);
    return trimmedDraft !== messageInfo.text;
  };

  editMessage = async () => {
    const { id: messageInfoID } = this.props.item.messageInfo;
    if (!this.isMessageEdited()) {
      this.exitEditMode();
      return;
    }
    if (!messageInfoID || !this.props.editState?.editedMessageDraft) {
      return;
    }
    try {
      await this.props.editMessage(
        messageInfoID,
        this.props.editState.editedMessageDraft,
      );
      this.exitEditMode();
    } catch (e) {
      this.props.setError(true);
    }
  };

  exitEditMode = () => {
    this.props.clearEditModal();
  };
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

export default ConnectedEditTextMessage;
export { ComposedEditTextMessage };
