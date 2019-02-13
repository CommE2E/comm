// @flow

import {
  type ChatMessageInfoItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import { assertComposableMessageType } from 'lib/types/message-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import CircleIcon from 'react-feather/dist/icons/circle';
import CheckCircleIcon from 'react-feather/dist/icons/check-circle';
import XCircleIcon from 'react-feather/dist/icons/x-circle';

import { stringForUser } from 'lib/shared/user-utils';

import FailedSend from './failed-send.react';
import css from './chat-message-list.css';

type Props = {|
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
  sendFailed: bool,
  children: React.Node,
|};
class ComposedMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    sendFailed: PropTypes.bool.isRequired,
    children: PropTypes.node.isRequired,
  };

  constructor(props: Props) {
    super(props);
    assertComposableMessageType(props.item.messageInfo.type);
  }

  componentDidUpdate(prevProps: Props) {
    assertComposableMessageType(this.props.item.messageInfo.type);
  }

  render() {
    assertComposableMessageType(this.props.item.messageInfo.type);
    const { id, creator } = this.props.item.messageInfo;
    const threadColor = this.props.threadInfo.color;

    const { isViewer } = creator;
    const contentClassName = classNames({
      [css.content]: true,
      [css.viewerContent]: isViewer,
      [css.nonViewerContent]: !isViewer,
    });
    const messageBoxStyle = {
      borderTopRightRadius:
        isViewer && !this.props.item.startsCluster ? 0 : 8,
      borderBottomRightRadius:
        isViewer && !this.props.item.endsCluster ? 0 : 8,
      borderTopLeftRadius:
        !isViewer && !this.props.item.startsCluster ? 0 : 8,
      borderBottomLeftRadius:
        !isViewer && !this.props.item.endsCluster ? 0 : 8,
    };

    let authorName = null;
    if (!isViewer && this.props.item.startsCluster) {
      authorName = (
        <span className={css.authorName}>
          {stringForUser(creator)}
        </span>
      );
    }

    let deliveryIcon = null;
    let failedSendInfo = null;
    if (isViewer) {
      let deliveryIconSpan;
      let deliveryIconColor = threadColor;
      if (id !== null && id !== undefined) {
        deliveryIconSpan = <CheckCircleIcon />;
      } else if (this.props.sendFailed) {
        deliveryIconSpan = <XCircleIcon />;
        deliveryIconColor = "FF0000";
        failedSendInfo = (
          <FailedSend
            item={this.props.item}
            threadInfo={this.props.threadInfo}
          />
        );
      } else {
        deliveryIconSpan = <CircleIcon />;
      }
      deliveryIcon = (
        <div
          className={css.iconContainer}
          style={{ color: `#${deliveryIconColor}` }}
        >
          {deliveryIconSpan}
        </div>
      );
    }

    return (
      <React.Fragment>
        {authorName}
        <div className={contentClassName}>
          <div className={css.messageBox} style={messageBoxStyle}>
            {this.props.children}
          </div>
          {deliveryIcon}
        </div>
        {failedSendInfo}
      </React.Fragment>
    );
  }

}

export default ComposedMessage;
