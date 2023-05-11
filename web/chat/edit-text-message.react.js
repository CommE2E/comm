// @flow

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
  +width: ?number,
};

const cancelButtonColor: ButtonColor = {
  backgroundColor: '#00000000',
};

function EditTextMessage(props: Props): React.Node {
  const { background, threadInfo } = props;
  const { editState, clearEditModal, setDraft } = useEditModalContext();

  const editedMessageDraft = editState?.editedMessageDraft ?? '';
  const threadColor = threadInfo.color;
  const saveButtonColor: ButtonColor = React.useMemo(() => {
    return {
      backgroundColor: `#${threadColor}`,
    };
  }, [threadColor]);
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
    const { background, width, ...restProps } = props;
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
