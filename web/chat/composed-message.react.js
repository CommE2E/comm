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
import { useSidebarExistsOrCanBeCreated } from 'lib/shared/thread-utils';
import { stringForUser } from 'lib/shared/user-utils';
import { assertComposableMessageType } from 'lib/types/message-types';
import { type ThreadInfo } from 'lib/types/thread-types';

import { type InputState, InputStateContext } from '../input/input-state';
import css from './chat-message-list.css';
import FailedSend from './failed-send.react';
import { InlineSidebar } from './inline-sidebar.react';
import MessageActionButton from './message-action-button';
import MessageReplyButton from './message-reply-button.react';
import {
  type OnMessagePositionWithContainerInfo,
  type MessagePositionInfo,
} from './position-types';
import { tooltipPositions } from './tooltip-utils';

const availableTooltipPositionsForViewerMessage = [
  tooltipPositions.TOP_RIGHT,
  tooltipPositions.LEFT,
];
const availableTooltipPositionsForNonViewerMessage = [
  tooltipPositions.TOP_LEFT,
  tooltipPositions.RIGHT,
];

type BaseProps = {|
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
  +sendFailed: boolean,
  +setMouseOverMessagePosition: (
    messagePositionInfo: MessagePositionInfo,
  ) => void,
  +mouseOverMessagePosition?: ?OnMessagePositionWithContainerInfo,
  +canReply: boolean,
  +children: React.Node,
  +fixedWidth?: boolean,
  +borderRadius: number,
|};
type BaseConfig = React.Config<BaseProps, typeof ComposedMessage.defaultProps>;
type Props = {|
  ...BaseProps,
  // Redux state
  +sidebarExistsOrCanBeCreated: boolean,
  // withInputState
  +inputState: ?InputState,
|};
class ComposedMessage extends React.PureComponent<Props> {
  static defaultProps: {| +borderRadius: number |} = {
    borderRadius: 8,
  };

  render(): React.Node {
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

    let replyButton;
    if (
      this.props.mouseOverMessagePosition &&
      this.props.mouseOverMessagePosition.item.messageInfo.id === id &&
      this.props.canReply
    ) {
      const { inputState } = this.props;
      invariant(inputState, 'inputState should be set in ComposedMessage');
      replyButton = (
        <MessageReplyButton
          messagePositionInfo={this.props.mouseOverMessagePosition}
          onReplyClick={this.onMouseLeave}
          inputState={inputState}
        />
      );
    }

    let messageActionButton;
    if (
      this.props.mouseOverMessagePosition &&
      this.props.mouseOverMessagePosition.item.messageInfo.id === id &&
      this.props.sidebarExistsOrCanBeCreated
    ) {
      const availableTooltipPositions = isViewer
        ? availableTooltipPositionsForViewerMessage
        : availableTooltipPositionsForNonViewerMessage;

      messageActionButton = (
        <MessageActionButton
          threadInfo={threadInfo}
          item={item}
          containerPosition={
            this.props.mouseOverMessagePosition.containerPosition
          }
          availableTooltipPositions={availableTooltipPositions}
        />
      );
    }

    let viewerActionLinks, nonViewerActionLinks;
    if (isViewer && (replyButton || messageActionButton)) {
      viewerActionLinks = (
        <div
          className={classNames(
            css.messageActionLinks,
            css.viewerMessageActionLinks,
          )}
        >
          {messageActionButton}
          {replyButton}
        </div>
      );
    } else if (replyButton || messageActionButton) {
      nonViewerActionLinks = (
        <div
          className={classNames(
            css.messageActionLinks,
            css.nonViewerMessageActionLinks,
          )}
        >
          {replyButton}
          {messageActionButton}
        </div>
      );
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
            {viewerActionLinks}
            <div className={messageBoxClassName} style={messageBoxStyle}>
              {this.props.children}
            </div>
            {nonViewerActionLinks}
          </div>
          {deliveryIcon}
        </div>
        {failedSendInfo}
        {inlineSidebar}
      </React.Fragment>
    );
  }

  onMouseEnter: (event: SyntheticEvent<HTMLDivElement>) => void = event => {
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

  onMouseLeave: () => void = () => {
    const { item } = this.props;
    this.props.setMouseOverMessagePosition({ type: 'off', item });
  };
}

type ConnectedConfig = React.Config<BaseProps, typeof ComposedMessage.defaultProps>;
const ConnectedComposedMessage: React.AbstractComponent<ConnectedConfig, mixed> = React.memo<BaseConfig>(function ConnectedComposedMessage(
  props
) {
  const sidebarExistsOrCanBeCreated = useSidebarExistsOrCanBeCreated(
    props.threadInfo,
    props.item,
  );
  const inputState = React.useContext(InputStateContext);
  return (
    <ComposedMessage
      {...props}
      sidebarExistsOrCanBeCreated={sidebarExistsOrCanBeCreated}
      inputState={inputState}
    />
  );
});

export default ConnectedComposedMessage;
