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
import { getMessageLabel } from 'lib/shared/edit-messages-utils.js';
import { assertComposableMessageType } from 'lib/types/message-types.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';

import { getComposedMessageID } from './chat-constants.js';
import css from './chat-message-list.css';
import FailedSend from './failed-send.react.js';
import InlineEngagement from './inline-engagement.react.js';
import UserAvatar from '../avatars/user-avatar.react.js';
import CommIcon from '../CommIcon.react.js';
import { type InputState, InputStateContext } from '../input/input-state.js';
import { useMessageTooltip } from '../utils/tooltip-action-utils.js';
import { tooltipPositions } from '../utils/tooltip-utils.js';

export type ComposedMessageID = string;

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
  +shouldDisplayPinIndicator: boolean,
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
    const { borderRadius, item, threadInfo, shouldDisplayPinIndicator } =
      this.props;
    const { hasBeenEdited, isPinned } = item;
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
    const { stringForUser } = this.props;
    if (stringForUser) {
      authorName = <span className={css.authorName}>{stringForUser}</span>;
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
    const label = getMessageLabel(hasBeenEdited, threadInfo.id);
    if (
      (this.props.containsInlineEngagement && item.threadCreatedFromMessage) ||
      Object.keys(item.reactions).length > 0 ||
      label
    ) {
      const positioning = isViewer ? 'right' : 'left';
      inlineEngagement = (
        <div className={css.sidebarMarginBottom}>
          <InlineEngagement
            sidebarThreadInfo={item.threadCreatedFromMessage}
            reactions={item.reactions}
            positioning={positioning}
            label={label}
          />
        </div>
      );
    }

    let avatar;
    if (!isViewer && item.endsCluster) {
      avatar = (
        <div className={css.avatarContainer}>
          <UserAvatar size="small" userID={creator.id} />
        </div>
      );
    } else if (!isViewer) {
      avatar = <div className={css.avatarOffset} />;
    }

    const pinIconPositioning = isViewer ? 'left' : 'right';
    const pinIconName = pinIconPositioning === 'left' ? 'pin-mirror' : 'pin';
    const pinIconContainerClassName = classNames({
      [css.pinIconContainer]: true,
      [css.pinIconLeft]: pinIconPositioning === 'left',
      [css.pinIconRight]: pinIconPositioning === 'right',
    });
    let pinIcon;
    if (isPinned && shouldDisplayPinIndicator) {
      pinIcon = (
        <div
          className={pinIconContainerClassName}
          style={{ color: `#${threadColor}` }}
        >
          <CommIcon icon={pinIconName} size={12} />
        </div>
      );
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
            {pinIcon}
            <div
              className={messageBoxClassName}
              style={messageBoxStyle}
              id={getComposedMessageID(item.messageInfo)}
            >
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
