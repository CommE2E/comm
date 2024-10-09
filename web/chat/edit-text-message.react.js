// @flow

import classNames from 'classnames';
import * as React from 'react';
import { useCallback } from 'react';
import { XCircle as XCircleIcon } from 'react-feather';

import type { ComposableChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { useEditMessage } from 'lib/shared/edit-messages-utils.js';
import { trimMessage } from 'lib/shared/message-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import { editBoxBottomRowHeight } from './chat-constants.js';
import ChatInputTextArea from './chat-input-text-area.react.js';
import ComposedMessage from './composed-message.react.js';
import { useEditModalContext } from './edit-message-provider.js';
import css from './edit-text-message.css';
import type { ButtonColor } from '../components/button.react.js';
import Button from '../components/button.react.js';

type Props = {
  +item: ComposableChatMessageInfoItem,
  +threadInfo: ThreadInfo,
  +background: boolean,
};

const cancelButtonColor: ButtonColor = {
  backgroundColor: 'transparent',
};

const bottomRowStyle = { height: editBoxBottomRowHeight };

function EditTextMessage(props: Props): React.Node {
  const { background, threadInfo, item } = props;
  const { editState, clearEditModal, setDraft, setError, updatePosition } =
    useEditModalContext();
  const editMessage = useEditMessage(threadInfo);

  const myRef = React.useRef<?HTMLDivElement>(null);

  const editedMessageDraft = editState?.editedMessageDraft ?? '';
  const threadColor = threadInfo.color;
  const saveButtonColor: ButtonColor = React.useMemo(
    () => ({
      backgroundColor: `#${threadColor}`,
    }),
    [threadColor],
  );

  const isMessageEmpty = React.useMemo(
    () => trimMessage(editedMessageDraft) === '',
    [editedMessageDraft],
  );

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
    if (isMessageEmpty) {
      return;
    }
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

  const updateDimensions = useCallback(() => {
    if (!myRef.current || !background) {
      return;
    }
    const { left, top, width, height } = myRef.current.getBoundingClientRect();
    updatePosition({
      left,
      top,
      width,
      height,
    });
  }, [background, updatePosition]);

  const preventCloseTab = React.useCallback(
    (event: BeforeUnloadEvent) => {
      if (!isMessageEdited) {
        return null;
      }
      event.preventDefault();
      return (event.returnValue = '');
    },
    [isMessageEdited],
  );

  React.useEffect(() => {
    if (!background) {
      return undefined;
    }
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('beforeunload', preventCloseTab);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('beforeunload', preventCloseTab);
    };
  }, [background, preventCloseTab, updateDimensions]);

  React.useEffect(() => {
    updateDimensions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const maxTextAreaHeight = editState?.maxHeight;

  return (
    <div className={containerStyle} ref={myRef}>
      <ChatInputTextArea
        focus={!background}
        currentText={editedMessageDraft}
        setCurrentText={setDraft}
        onChangePosition={updateDimensions}
        send={checkAndEdit}
        maxHeight={maxTextAreaHeight}
      />
      <div className={css.bottomRow} style={bottomRowStyle}>
        {editFailed}
        <div className={css.buttons}>
          <Button
            className={[css.saveButton, css.smallButton]}
            variant="filled"
            buttonColor={saveButtonColor}
            onClick={checkAndEdit}
            disabled={isMessageEmpty}
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
