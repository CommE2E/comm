// @flow

import {
  type ChatMessageInfoItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import { messageTypes } from 'lib/types/message-types';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';

import * as React from 'react';
import invariant from 'invariant';
import classNames from 'classnames';
import Linkify from 'react-linkify';

import { colorIsDark } from 'lib/shared/thread-utils';
import { onlyEmojiRegex } from 'lib/shared/emojis';
import { stringForUser } from 'lib/shared/user-utils';

import css from './chat-message-list.css';

type Props = {|
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
|};
class TextMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
  };

  constructor(props: Props) {
    super(props);
    invariant(
      props.item.messageInfo.type === messageTypes.TEXT,
      "TextMessage should only be used for messageTypes.TEXT",
    );
  }

  componentWillReceiveProps(nextProps: Props) {
    invariant(
      nextProps.item.messageInfo.type === messageTypes.TEXT,
      "TextMessage should only be used for messageTypes.TEXT",
    );
  }

  render() {
    invariant(
      this.props.item.messageInfo.type === messageTypes.TEXT,
      "TextMessage should only be used for messageTypes.TEXT",
    );
    const text = this.props.item.messageInfo.text;

    const isViewer = this.props.item.messageInfo.creator.isViewer;
    const onlyEmoji = onlyEmojiRegex.test(text);
    const containerClassName = classNames({
      [css.textMessage]: true,
      [css.normalTextMessage]: !onlyEmoji,
      [css.emojiOnlyTextMessage]: onlyEmoji,
      [css.rightChatBubble]: isViewer,
      [css.leftChatBubble]: !isViewer,
    });
    let darkColor = false;
    const messageStyle = {};
    if (isViewer) {
      darkColor = colorIsDark(this.props.threadInfo.color);
      messageStyle.backgroundColor = `#${this.props.threadInfo.color}`;
      messageStyle.color = darkColor ? 'white' : 'black';
    } else {
      messageStyle.backgroundColor = "#DDDDDDBB";
      messageStyle.color = 'black';
    }
    let authorName = null;
    if (!isViewer && this.props.item.startsCluster) {
      authorName = (
        <span className={css.authorName}>
          {stringForUser(this.props.item.messageInfo.creator)}
        </span>
      );
    }
    messageStyle.borderTopRightRadius =
      isViewer && !this.props.item.startsCluster ? 0 : 8;
    messageStyle.borderBottomRightRadius =
      isViewer && !this.props.item.endsCluster ? 0 : 8;
    messageStyle.borderTopLeftRadius =
      !isViewer && !this.props.item.startsCluster ? 0 : 8;
    messageStyle.borderBottomLeftRadius =
      !isViewer && !this.props.item.endsCluster ? 0 : 8;
    messageStyle.marginBottom = this.props.item.endsCluster ? 12 : 5;

    return (
      <React.Fragment>
        <div className={containerClassName} style={messageStyle}>
          <Linkify>
            {text}
          </Linkify>
        </div>
        {authorName}
      </React.Fragment>
    );
  }

}

export default TextMessage;
