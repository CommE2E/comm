// @flow

import * as React from 'react';
import invariant from 'invariant';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import faChevronRight from '@fortawesome/fontawesome-free-solid/faChevronRight';

import css from './chat-message-list.css';

type Props = {|
|};
type State = {|
  messageText: string,
|};
class ChatInputBar extends React.PureComponent<Props, State> {

  static propTypes = {
  };
  state = {
    messageText: "",
  };
  textarea: ?HTMLTextAreaElement = null;

  componentDidMount() {
    this.updateHeight();
  }

  updateHeight = () => {
    const textarea = this.textarea;
    invariant(
      textarea instanceof HTMLTextAreaElement,
      "textarea ref not set",
    );
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 150);
    textarea.style.height = `${newHeight}px`;
  }

  render() {
    return (
      <div className={css.inputBar}>
        <textarea
          rows="1"
          placeholder="Send a message..."
          value={this.state.messageText}
          onChange={this.onChangeMessageText}
          ref={this.textareaRef}
        />
        <span className={css.send}>
          Send
          <FontAwesomeIcon
            icon={faChevronRight}
            className={css.sendButton}
          />
        </span>
      </div>
    );
  }

  textareaRef = (textarea: ?HTMLTextAreaElement) => {
    this.textarea = textarea;
  }

  onChangeMessageText = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    const messageText = event.currentTarget.value;
    this.setState(
      { messageText },
      this.updateHeight,
    );
  }

}

export default ChatInputBar; 
