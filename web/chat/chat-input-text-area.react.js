// @flow

import invariant from 'invariant';
import * as React from 'react';

import css from './chat-input-bar.css';

type BaseProps = {
  +send?: () => mixed,
  +escape?: () => void,
  +focus: boolean,
  +currentText: string,
  +setCurrentText: (text: string) => void,
  +onChangePosition: any => void,
};
type Props = {
  ...BaseProps,
};

class ChatInputTextArea extends React.PureComponent<Props> {
  textarea: ?HTMLTextAreaElement;

  componentDidMount() {
    this.updateHeight();
    this.focusAndUpdateText();
  }

  componentDidUpdate(prevProps: Props) {
    const { currentText } = this.props;
    const { currentText: prevText } = prevProps;
    if (currentText !== prevText) {
      this.updateHeight();
    }
  }

  updateHeight() {
    const textarea = this.textarea;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 150);
      textarea.style.height = `${newHeight}px`;
    }
    this.props.onChangePosition();
  }

  render() {
    return (
      <div className={css.inputBarTextInput}>
        <textarea
          rows="1"
          placeholder="Type your message"
          value={this.props.currentText}
          onChange={this.onChangeMessageText}
          onKeyDown={this.onKeyDown}
          ref={this.textareaRef}
          autoFocus
        />
      </div>
    );
  }

  textareaRef = (textarea: ?HTMLTextAreaElement) => {
    this.textarea = textarea;
    if (textarea) {
      textarea.focus();
    }
  };

  setCurrentText = (text: string) => {
    this.props.setCurrentText(text);
  };

  onChangeMessageText = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    this.setCurrentText(event.currentTarget.value);
  };

  focusAndUpdateText = () => {
    if (!this.props.focus) {
      return;
    }

    // We need to call focus() first on Safari, otherwise the cursor
    // ends up at the start instead of the end for some reason
    const { textarea } = this;
    invariant(textarea, 'textarea should be set');
    textarea.focus();

    // We reset the textarea to an empty string at the start so that the cursor
    // always ends up at the end, even if the text doesn't actually change
    textarea.value = '';
    const { currentText } = this.props;
    if (currentText) {
      textarea.value = currentText;
    }

    // The above strategies make sure the cursor is at the end,
    // but we also need to make sure that we're scrolled to the bottom
    textarea.scrollTop = textarea.scrollHeight;
  };

  onKeyDown = (event: SyntheticKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (!this.props.escape) {
        return;
      }
      this.props.escape();
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!this.props.send) {
        return;
      }
      this.props.send();
    }
  };
}

const ConnectedChatInputTextArea: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedChatInputBar(props) {
    return <ChatInputTextArea {...props} />;
  });

export default ConnectedChatInputTextArea;
