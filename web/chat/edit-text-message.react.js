// @flow

import classNames from 'classnames';
import * as React from 'react';
import { XCircle as XCircleIcon } from 'react-feather';

import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';

import cssInputBar from './chat-input-bar.css';
import ChatInputTextArea from './chat-input-text-area.react.js';
import ComposedMessage from './composed-message.react.js';
import { useEditModalContext } from './edit-message-provider.js';
import css from './edit-text-message.css';
import type { ButtonColor } from '../components/button.react.js';
import Button from '../components/button.react.js';

type Props = {
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
  +background: boolean,
};

const cancelButtonColor: ButtonColor = {
  backgroundColor: 'transparent',
};

function EditTextMessage(props: Props): React.Node {
  const { background, threadInfo } = props;
  const { editState, clearEditModal, setDraft } = useEditModalContext();

  const editedMessageDraft = editState?.editedMessageDraft ?? '';
  const threadColor = threadInfo.color;
  const saveButtonColor: ButtonColor = React.useMemo(
    () => ({
      backgroundColor: `#${threadColor}`,
    }),
    [threadColor],
  );
  let editFailed;
  if (editState?.isError) {
    editFailed = (
      <div className={css.failedText}>
        <XCircleIcon className={css.icon} />
        <div className={css.errorColor}>Edit failed.</div>
        <div className={css.whiteColor}>Please try again.</div>
      </div>
    );
  }

  const containerStyle = classNames(css.editMessage, {
    [css.backgroundEditMessage]: background,
  });

  return (
    <div className={containerStyle}>
      <div className={cssInputBar.inputBarTextInput}>
        <ChatInputTextArea
          focus={!background}
          currentText={editedMessageDraft}
          setCurrentText={setDraft}
        />
      </div>
      <div className={css.bottomRow}>
        {editFailed}
        <div className={css.buttons}>
          <Button
            className={[css.saveButton, css.smallButton]}
            variant="filled"
            buttonColor={saveButtonColor}
          >
            Save (enter)
          </Button>
          <Button
            className={css.smallButton}
            variant="filled"
            buttonColor={cancelButtonColor}
            onClick={clearEditModal}
          >
            Cancel (esc)
          </Button>
        </div>
      </div>
    </div>
  );
}

const ComposedEditTextMessage: React.ComponentType<Props> = React.memo<Props>(
  function ComposedEditTextMessage(props) {
    const { background, ...restProps } = props;
    return (
      <ComposedMessage
        {...restProps}
        sendFailed={false}
        shouldDisplayPinIndicator={false}
      >
        <EditTextMessage {...props} />
      </ComposedMessage>
    );
  },
);

export { EditTextMessage, ComposedEditTextMessage };
