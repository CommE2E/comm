// @flow

import {
  type ChatMessageInfoItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import { assertComposableMessageType } from 'lib/types/message-types';
import {
  type OnMessagePositionInfo,
  type MessagePositionInfo,
  onMessagePositionInfoPropType,
} from './message-position-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {
  Circle as CircleIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
} from 'react-feather';

import { stringForUser } from 'lib/shared/user-utils';

import FailedSend from './failed-send.react';
import css from './chat-message-list.css';
import MessageReplyTooltip from './message-reply-tooltip.react';
import {
  inputStatePropType,
  type InputState,
  withInputState,
} from '../input/input-state';

type Props = {|
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
  sendFailed: boolean,
  setMouseOverMessagePosition: (
    messagePositionInfo: MessagePositionInfo,
  ) => void,
  mouseOverMessagePosition?: ?OnMessagePositionInfo,
  canReply: boolean,
  children: React.Node,
  fixedWidth?: boolean,
  borderRadius: number,
  // withInputState
  inputState: InputState,
|};
class ComposedMessage extends React.PureComponent<Props> {
  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    sendFailed: PropTypes.bool.isRequired,
    setMouseOverMessagePosition: PropTypes.func.isRequired,
    mouseOverMessagePosition: onMessagePositionInfoPropType,
    canReply: PropTypes.bool.isRequired,
    children: PropTypes.node.isRequired,
    fixedWidth: PropTypes.bool,
    borderRadius: PropTypes.number.isRequired,
    inputState: inputStatePropType.isRequired,
  };
  static defaultProps = {
    borderRadius: 8,
  };

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
    const messageBoxContainerClassName = classNames({
      [css.messageBoxContainer]: true,
      [css.viewerMessageBoxContainer]: isViewer,
      [css.nonViewerMessageBoxContainer]: !isViewer,
      [css.fixedWidthMessageBoxContainer]: this.props.fixedWidth,
    });
    const messageBoxClassName = classNames({
      [css.messageBox]: true,
      [css.fixedWidthMessageBox]: this.props.fixedWidth,
    });
    const messageBoxStyle = {
      borderTopRightRadius: isViewer && !item.startsCluster ? 0 : borderRadius,
      borderBottomRightRadius: isViewer && !item.endsCluster ? 0 : borderRadius,
      borderTopLeftRadius: !isViewer && !item.startsCluster ? 0 : borderRadius,
      borderBottomLeftRadius: !isViewer && !item.endsCluster ? 0 : borderRadius,
    };

    let authorName = null;
    if (!isViewer && item.startsCluster) {
      authorName = (
        <span className={css.authorName}>{stringForUser(creator)}</span>
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
        deliveryIconColor = 'FF0000';
        failedSendInfo = <FailedSend item={item} threadInfo={threadInfo} />;
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

    let viewerTooltip, nonViewerTooltip;
    if (
      this.props.mouseOverMessagePosition &&
      this.props.mouseOverMessagePosition.item.messageInfo.id === id &&
      this.props.canReply
    ) {
      const replyTooltip = (
        <MessageReplyTooltip
          messagePositionInfo={this.props.mouseOverMessagePosition}
          onReplyClick={this.onMouseLeave}
          inputState={this.props.inputState}
        />
      );
      if (isViewer) {
        viewerTooltip = replyTooltip;
      } else {
        nonViewerTooltip = replyTooltip;
      }
    }

    return (
      <React.Fragment>
        {authorName}
        <div className={contentClassName}>
          <div
            className={messageBoxContainerClassName}
            onMouseEnter={this.onMouseEnter}
            onMouseLeave={this.onMouseLeave}
          >
            {viewerTooltip}
            <div className={messageBoxClassName} style={messageBoxStyle}>
              {this.props.children}
            </div>
            {nonViewerTooltip}
          </div>
          {deliveryIcon}
        </div>
        {failedSendInfo}
      </React.Fragment>
    );
  }

  onMouseEnter = (event: SyntheticEvent<HTMLDivElement>) => {
    const { item } = this.props;
    const rect = event.currentTarget.getBoundingClientRect();
    const { top, bottom, left, right, height, width } = rect;
    const messagePosition = { top, bottom, left, right, height, width };
    this.props.setMouseOverMessagePosition({
      type: 'on',
      item,
      messagePosition,
    });
  };

  onMouseLeave = () => {
    const { item } = this.props;
    this.props.setMouseOverMessagePosition({ type: 'off', item });
  };
}

export default withInputState(ComposedMessage);
