// @flow

import {
  type ChatMessageItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import { messageTypes } from 'lib/types/message-types';

import { robotextToRawString } from 'lib/shared/message-utils';

import * as React from 'react';

type Props = {|
  item: ChatMessageItem,
|};
class Message extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
  };

  render() {
    if (this.props.item.itemType === "loader") {
      return (
        <div>
          Spin spin
        </div>
      );
    } else if (this.props.item.messageInfo.type === messageTypes.TEXT) {
      return (
        <div>
          {this.props.item.messageInfo.text}
        </div>
      );
    } else {
      return (
        <div>
          {this.props.item.robotext}
        </div>
      );
    }
  }

}

export default Message;
