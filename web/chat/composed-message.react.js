// @flow

import classNames from 'classnames';
import * as React from 'react';
import {
  Circle as CircleIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
} from 'react-feather';

import { useStringForUser } from 'lib/hooks/ens-cache.js';
import { type ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { assertComposableMessageType } from 'lib/types/message-types.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';

import css from './chat-message-list.css';
import FailedSend from './failed-send.react.js';
import InlineEngagement from './inline-engagement.react.js';
import UserAvatar from '../components/user-avatar.react.js';
import { type InputState, InputStateContext } from '../input/input-state.js';
import { shouldRenderAvatars } from '../utils/avatar-utils.js';
import { tooltipPositions, useMessageTooltip } from '../utils/tooltip-utils.js';

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
  +containsInlineEngagement: boolean,
  +stringForUser: ?string,
};
class ComposedMessage extends React.PureComponent<Props> {
  static defaultProps: { +borderRadius: number } = {
    borderRadius: 8,
  };

  render(): React.Node {
    assertComposableMessageType(this.props.item.messageInfo.type);
    const { borderRadius, item, threadInfo } = this.props;
    const { hasBeenEdited } = item;
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
      [css.messageBoxContainerPositionAvatar]: shouldRenderAvatars,
      [css.messageBoxContainerPositionNoAvatar]: !shouldRenderAvatars,
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
    const { stringForUser } = this.props;
    const authorNameClassName = classNames({
      [css.authorName]: true,
      [css.authorNamePositionAvatar]: shouldRenderAvatars,
      [css.authorNamePositionNoAvatar]: !shouldRenderAvatars,
    });
    if (stringForUser) {
      authorName = <span className={authorNameClassName}>{stringForUser}</span>;
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

    let inlineEngagement = null;
    if (
      (this.props.containsInlineEngagement && item.threadCreatedFromMessage) ||
      Object.keys(item.reactions).length > 0 ||
      hasBeenEdited
    ) {
      const positioning = isViewer ? 'right' : 'left';
      const label = hasBeenEdited ? 'Edited' : null;
      inlineEngagement = (
        <div className={css.sidebarMarginBottom}>
          <InlineEngagement
            threadInfo={item.threadCreatedFromMessage}
            reactions={item.reactions}
            positioning={positioning}
            label={label}
          />
        </div>
      );
    }

    let avatar;
    if (!isViewer && item.endsCluster && shouldRenderAvatars) {
      avatar = (
        <div className={css.avatarContainer}>
          <UserAvatar size="small" userID={creator.id} />
        </div>
      );
    } else if (!isViewer && shouldRenderAvatars) {
      avatar = <div className={css.avatarOffset} />;
    }

    return (
      <React.Fragment>
        {authorName}
        <div className={contentClassName}>
          {avatar}
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
        {inlineEngagement}
      </React.Fragment>
    );
  }
}

type ConnectedConfig = React.Config<
  BaseProps,
  typeof ComposedMessage.defaultProps,
>;
const ConnectedComposedMessage: React.ComponentType<ConnectedConfig> =
  React.memo<BaseConfig>(function ConnectedComposedMessage(props) {
    const { item, threadInfo } = props;
    const inputState = React.useContext(InputStateContext);
    const { creator } = props.item.messageInfo;
    const { isViewer } = creator;
    const availablePositions = isViewer
      ? availableTooltipPositionsForViewerMessage
      : availableTooltipPositionsForNonViewerMessage;
    const containsInlineEngagement = !!item.threadCreatedFromMessage;

    const { onMouseLeave, onMouseEnter } = useMessageTooltip({
      item,
      threadInfo,
      availablePositions,
    });

    const shouldShowUsername = !isViewer && item.startsCluster;
    const stringForUser = useStringForUser(shouldShowUsername ? creator : null);

    return (
      <ComposedMessage
        {...props}
        inputState={inputState}
        onMouseLeave={onMouseLeave}
        onMouseEnter={onMouseEnter}
        containsInlineEngagement={containsInlineEngagement}
        stringForUser={stringForUser}
      />
    );
  });

export default ConnectedComposedMessage;
