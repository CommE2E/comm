// @flow

import {
  type ChatMessageInfoItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import { messageTypes } from 'lib/types/message-types';

import * as React from 'react';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { messageKey } from 'lib/shared/message-utils';

import css from './chat-message-list.css';

type Props = {|
  item: ChatMessageInfoItem,
  toggleFocus: (messageKey: string) => void,
|};
class MultimediaMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    toggleFocus: PropTypes.func.isRequired,
  };

  constructor(props: Props) {
    super(props);
    invariant(
      props.item.messageInfo.type === messageTypes.MULTIMEDIA,
      "MultimediaMessage should only be used for messageTypes.MULTIMEDIA",
    );
  }

  componentWillReceiveProps(nextProps: Props) {
    invariant(
      nextProps.item.messageInfo.type === messageTypes.MULTIMEDIA,
      "MultimediaMessage should only be used for messageTypes.MULTIMEDIA",
    );
  }

  render() {
    invariant(
      this.props.item.messageInfo.type === messageTypes.MULTIMEDIA,
      "MultimediaMessage should only be used for messageTypes.MULTIMEDIA",
    );
    return (
      <div className={css.robotext} onClick={this.onClick}>
        Blah blah image
      </div>
    );
  }

  onClick = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
    this.props.toggleFocus(messageKey(this.props.item.messageInfo));
  }

}

export default MultimediaMessage;
