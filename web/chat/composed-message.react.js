// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';
import {
  Circle as CircleIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
} from 'react-feather';

import { type ChatMessageInfoItem } from 'lib/selectors/chat-selectors';
import { stringForUser } from 'lib/shared/user-utils';
import { assertComposableMessageType } from 'lib/types/message-types';
import { type ThreadInfo } from 'lib/types/thread-types';

import { type InputState, InputStateContext } from '../input/input-state';
import css from './chat-message-list.css';
import FailedSend from './failed-send.react';
import { InlineSidebar } from './inline-sidebar.react';
import {
  type OnMessagePositionInfo,
  type MessagePositionInfo,
} from './message-position-types';
import MessageReplyTooltip from './message-reply-tooltip.react';

type BaseProps = {|
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
  +sendFailed: boolean,
  +setMouseOverMessagePosition: (
    messagePositionInfo: MessagePositionInfo,
  ) => void,
  +mouseOverMessagePosition?: ?OnMessagePositionInfo,
  +canReply: boolean,
  +children: React.Node,
  +fixedWidth?: boolean,
  +borderRadius: number,
|};
type BaseConfig = React.Config<BaseProps, typeof ComposedMessage.defaultProps>;
type Props = {|
  ...BaseProps,
  // withInputState
  +inputState: ?InputState,
|};
class ComposedMessage extends React.PureComponent<Props> {
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
      const { inputState } = this.props;
      invariant(inputState, 'inputState should be set in ComposedMessage');
      const replyTooltip = (
        <MessageReplyTooltip
          messagePositionInfo={this.props.mouseOverMessagePosition}
          onReplyClick={this.onMouseLeave}
          inputState={inputState}
        />
      );
      if (isViewer) {
        viewerTooltip = replyTooltip;
      } else {
        nonViewerTooltip = replyTooltip;
      }
    }

    let inlineSidebar = null;
    if (item.threadCreatedFromMessage) {
      const positioning = isViewer ? 'right' : 'left';
      inlineSidebar = (
        <div className={css.sidebarMarginBottom}>
          <InlineSidebar
            threadInfo={item.threadCreatedFromMessage}
            positioning={positioning}
          />
        </div>
      );
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
        {inlineSidebar}
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

export default React.memo<BaseConfig>(function ConnectedComposedMessage(
  props: BaseConfig,
) {
  const inputState = React.useContext(InputStateContext);
  return <ComposedMessage {...props} inputState={inputState} />;
});
