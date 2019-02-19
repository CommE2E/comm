// @flow

import {
  type ChatMessageInfoItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import { assertComposableMessageType } from 'lib/types/message-types';
import type { MessagePositionInfo } from './message.react';

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
  setMouseOver: (messagePositionInfo: MessagePositionInfo) => void,
  children: React.Node,
  className?: string,
  borderRadius: number,
|};
class ComposedMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    sendFailed: PropTypes.bool.isRequired,
    setMouseOver: PropTypes.func.isRequired,
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    borderRadius: PropTypes.number.isRequired,
  };
  static defaultProps = {
    borderRadius: 8,
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
    const { borderRadius, item, threadInfo } = this.props;
    const { id, creator } = item.messageInfo;
    const threadColor = threadInfo.color;

    const { isViewer } = creator;
    const contentClassName = classNames({
      [css.content]: true,
      [css.viewerContent]: isViewer,
      [css.nonViewerContent]: !isViewer,
    });
    const messageBoxStyle = {
      borderTopRightRadius:
        isViewer && !item.startsCluster ? 0 : borderRadius,
      borderBottomRightRadius:
        isViewer && !item.endsCluster ? 0 : borderRadius,
      borderTopLeftRadius:
        !isViewer && !item.startsCluster ? 0 : borderRadius,
      borderBottomLeftRadius:
        !isViewer && !item.endsCluster ? 0 : borderRadius,
    };

    let authorName = null;
    if (!isViewer && item.startsCluster) {
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
            item={item}
            threadInfo={threadInfo}
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
          <div
            className={classNames(css.messageBox, this.props.className)}
            style={messageBoxStyle}
            onMouseOver={this.onMouseOver}
            onMouseOut={this.onMouseOut}
          >
            {this.props.children}
          </div>
          {deliveryIcon}
        </div>
        {failedSendInfo}
      </React.Fragment>
    );
  }

  onMouseOver = (event: SyntheticEvent<HTMLDivElement>) => {
    const { item } = this.props;
    const rect = event.currentTarget.getBoundingClientRect();
    const { top, bottom, left, right, height, width } = rect;
    const messagePosition = { top, bottom, left, right, height, width };
    this.props.setMouseOver({ type: "on", item, messagePosition });
  }

  onMouseOut = () => {
    const { item } = this.props;
    this.props.setMouseOver({ type: "off", item });
  }

}

export default ComposedMessage;
