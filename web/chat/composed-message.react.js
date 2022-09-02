// @flow

import classNames from 'classnames';
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
import InlineSidebar from './inline-sidebar.react';
import { tooltipPositions, useMessageTooltip } from './tooltip-utils';

const availableTooltipPositionsForViewerMessage = [
  tooltipPositions.LEFT,
  tooltipPositions.LEFT_BOTTOM,
  tooltipPositions.LEFT_TOP,
  tooltipPositions.RIGHT,
  tooltipPositions.RIGHT_BOTTOM,
  tooltipPositions.RIGHT_TOP,
  tooltipPositions.BOTTOM,
  tooltipPositions.TOP,
];
const availableTooltipPositionsForNonViewerMessage = [
  tooltipPositions.RIGHT,
  tooltipPositions.RIGHT_BOTTOM,
  tooltipPositions.RIGHT_TOP,
  tooltipPositions.LEFT,
  tooltipPositions.LEFT_BOTTOM,
  tooltipPositions.LEFT_TOP,
  tooltipPositions.BOTTOM,
  tooltipPositions.TOP,
];

type BaseProps = {
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
  +sendFailed: boolean,
  +children: React.Node,
  +fixedWidth?: boolean,
  +borderRadius: number,
};
type BaseConfig = React.Config<BaseProps, typeof ComposedMessage.defaultProps>;
type Props = {
  ...BaseProps,
  // withInputState
  +inputState: ?InputState,
  +onMouseLeave: ?() => mixed,
  +onMouseEnter: (event: SyntheticEvent<HTMLDivElement>) => mixed,
  +containsInlineSidebar: boolean,
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

    let inlineSidebar = null;
    if (this.props.containsInlineSidebar && item.threadCreatedFromMessage) {
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
            onMouseEnter={this.props.onMouseEnter}
            onMouseLeave={this.props.onMouseLeave}
          >
            <div className={messageBoxClassName} style={messageBoxStyle}>
              {this.props.children}
            </div>
          </div>
          {deliveryIcon}
        </div>
        {failedSendInfo}
        {inlineSidebar}
      </React.Fragment>
    );
  }
}

type ConnectedConfig = React.Config<
  BaseProps,
  typeof ComposedMessage.defaultProps,
>;
const ConnectedComposedMessage: React.ComponentType<ConnectedConfig> = React.memo<BaseConfig>(
  function ConnectedComposedMessage(props) {
    const { item, threadInfo } = props;
    const inputState = React.useContext(InputStateContext);
    const isViewer = props.item.messageInfo.creator.isViewer;
    const availablePositions = isViewer
      ? availableTooltipPositionsForViewerMessage
      : availableTooltipPositionsForNonViewerMessage;
    const containsInlineSidebar = !!item.threadCreatedFromMessage;

    const { onMouseLeave, onMouseEnter } = useMessageTooltip({
      item,
      threadInfo,
      availablePositions,
    });

    return (
      <ComposedMessage
        {...props}
        inputState={inputState}
        onMouseLeave={onMouseLeave}
        onMouseEnter={onMouseEnter}
        containsInlineSidebar={containsInlineSidebar}
      />
    );
  },
);

export default ConnectedComposedMessage;
