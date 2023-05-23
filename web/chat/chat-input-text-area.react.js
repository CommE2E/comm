// @flow

import invariant from 'invariant';
import * as React from 'react';

import css from './chat-input-bar.css';

type Props = {
  +send?: () => mixed,
  +escape?: () => void,
  +focus: boolean,
  +currentText: string,
  +setCurrentText: (text: string) => void,
};

const ChatInputTextArea: React.ComponentType<Props> = React.memo<Props>(
  function ChatInputTextArea(props: Props) {
    const { currentText, focus, escape, send, setCurrentText } = props;
    const textareaRef = React.useRef(null);

    const focusAndUpdateText = React.useCallback(() => {
      if (!focus) {
        return;
      }

      // We need to call focus() first on Safari, otherwise the cursor
      // ends up at the start instead of the end for some reason
      const textarea = textareaRef.current;
      invariant(textarea, 'textarea should be set');
      textarea.focus();

      // We reset the textarea to an empty string at the start so that
      // the cursor always ends up at the end, even if the text doesn't
      // actually change
      textarea.value = '';
      if (currentText) {
        textarea.value = currentText;
      }
      // The above strategies make sure the cursor is at the end,
      // but we also need to make sure that we're scrolled to the bottom
      textarea.scrollTop = textarea.scrollHeight;
    }, [currentText, focus]);

    const updateHeight = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 150);
        textarea.style.height = `${newHeight}px`;
      }
    }, []);

    React.useEffect(() => {
      updateHeight();
      focusAndUpdateText();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentText]);

    const onKeyDown = (event: SyntheticKeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!escape) {
          return;
        }
        escape();
      } else if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (!send) {
          return;
        }
        send();
      }
    };

    const onChangeMessageText = (
      event: SyntheticEvent<HTMLTextAreaElement>,
    ) => {
      setCurrentText(event.currentTarget.value);
      updateHeight();
    };

    return (
      <div className={css.inputBarTextInput}>
        <textarea
          rows="1"
          placeholder="Type your message"
          value={currentText}
          onChange={onChangeMessageText}
          onKeyDown={onKeyDown}
          ref={textareaRef}
          autoFocus
        />
      </div>
    );
  },
);

export default ChatInputTextArea;
