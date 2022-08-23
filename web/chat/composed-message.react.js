// @flow

import classNames from 'classnames';
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

import { InputStateContext } from '../input/input-state';
import css from './chat-message-list.css';
import FailedSend from './failed-send.react';
import { InlineSidebar } from './inline-sidebar.react';
import MessageTooltip from './message-tooltip.react';
import type { MessageReplyProps } from './message-tooltip.react';
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

type BaseProps = {
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
  +sendFailed: boolean,
  +setMouseOverMessagePosition: (
    messagePositionInfo: MessagePositionInfo,
  ) => void,
  +mouseOverMessagePosition?: ?OnMessagePositionWithContainerInfo,
  +children: React.Node,
  +fixedWidth?: boolean,
  +borderRadius: number,
};
type Props = {
  ...BaseProps,
  // Redux state
  +sidebarExistsOrCanBeCreated: boolean,
  +messageReplyProps: MessageReplyProps,
};
class ComposedMessage extends React.PureComponent<Props> {
  static defaultProps: { +borderRadius: number } = {
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

    let messageTooltip;
    if (
      this.props.mouseOverMessagePosition &&
      this.props.mouseOverMessagePosition.item.messageInfo.id === id &&
      (this.props.sidebarExistsOrCanBeCreated ||
        this.props.messageReplyProps.canReply)
    ) {
      const availableTooltipPositions = isViewer
        ? availableTooltipPositionsForViewerMessage
        : availableTooltipPositionsForNonViewerMessage;
      messageTooltip = (
        <MessageTooltip
          threadInfo={threadInfo}
          item={item}
          availableTooltipPositions={availableTooltipPositions}
          mouseOverMessagePosition={this.props.mouseOverMessagePosition}
          messageReplyProps={this.props.messageReplyProps}
        />
      );
    }

    let messageTooltipLinks;
    if (messageTooltip) {
      const tooltipLinksClassName = classNames({
        [css.messageTooltipActiveArea]: true,
        [css.viewerMessageTooltipActiveArea]: isViewer,
        [css.nonViewerMessageActiveArea]: !isViewer,
      });

      messageTooltipLinks = (
        <div className={tooltipLinksClassName}>{messageTooltip}</div>
      );
    }

    const viewerTooltipLinks = isViewer ? messageTooltipLinks : null;
    const nonViewerTooltipLinks = !isViewer ? messageTooltipLinks : null;

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
            {viewerTooltipLinks}
            <div className={messageBoxClassName} style={messageBoxStyle}>
              {this.props.children}
            </div>
            {nonViewerTooltipLinks}
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

type ConnectedComponentProps = { ...BaseProps, +canReply: boolean };
type ConnectedConfig = React.Config<
  ConnectedComponentProps,
  typeof ComposedMessage.defaultProps,
>;
const ConnectedComposedMessage: React.ComponentType<ConnectedConfig> = React.memo<ConnectedConfig>(
  function ConnectedComposedMessage(props) {
    const { canReply, ...composedMessageProps } = props;
    const sidebarExistsOrCanBeCreated = useSidebarExistsOrCanBeCreated(
      props.threadInfo,
      props.item,
    );
    const inputState = React.useContext(InputStateContext);
    const messageReplyProps = React.useMemo(() => {
      if (canReply) {
        return {
          canReply,
          inputState,
          setMouseOverMessagePosition: props.setMouseOverMessagePosition,
        };
      }
      return { canReply };
    }, [inputState, canReply, props.setMouseOverMessagePosition]);

    return (
      <ComposedMessage
        {...composedMessageProps}
        sidebarExistsOrCanBeCreated={sidebarExistsOrCanBeCreated}
        messageReplyProps={messageReplyProps}
      />
    );
  },
);

export default ConnectedComposedMessage;
