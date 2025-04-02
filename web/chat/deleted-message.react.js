// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import type { ComposableChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import css from './chat-message-list.css';
import ComposedMessage from './composed-message.react.js';
import { MessageListContext } from './message-list-types.js';
import Markdown from '../markdown/markdown.react.js';

type Props = {
  +item: ComposableChatMessageInfoItem,
  +threadInfo: ThreadInfo,
};
function DeletedMessage(props: Props): React.Node {
  const messageClassName = classNames([
    css.textMessage,
    css.normalTextMessage,
    css.lightTextMessage,
    css.deletedMessageContent,
  ]);

  const messageListContext = React.useContext(MessageListContext);
  invariant(messageListContext, 'DummyTextNode should have MessageListContext');
  const rules = messageListContext.getTextMessageMarkdownRules(true);
  return (
    <ComposedMessage
      item={props.item}
      threadInfo={props.threadInfo}
      shouldDisplayPinIndicator={false}
      sendFailed={false}
    >
      <div className={messageClassName}>
        <SWMansionIcon icon="block-2" size={16} />
        <Markdown rules={rules}>*Deleted message*</Markdown>
      </div>
    </ComposedMessage>
  );
}

export default DeletedMessage;
