// @flow

import classNames from 'classnames';
import * as React from 'react';
import {
  CheckCircle as CheckCircleIcon,
  Circle as CircleIcon,
  XCircle as XCircleIcon,
} from 'react-feather';

import { useStringForUser } from 'lib/hooks/ens-cache.js';
import { type ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { getMessageLabel } from 'lib/shared/edit-messages-utils.js';
import { assertComposableMessageType } from 'lib/types/message-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import { getComposedMessageID } from './chat-constants.js';
import css from './chat-message-list.css';
import FailedSend from './failed-send.react.js';
import InlineEngagement from './inline-engagement.react.js';
import UserAvatar from '../avatars/user-avatar.react.js';
import CommIcon from '../comm-icon.react.js';
import { usePushUserProfileModal } from '../modals/user-profile/user-profile-utils.js';
import { useMessageTooltip } from '../tooltips/tooltip-action-utils.js';
import { tooltipPositions } from '../tooltips/tooltip-utils.js';

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

type Props = {
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
  +shouldDisplayPinIndicator: boolean,
  +sendFailed: boolean,
  +children: React.Node,
  +fixedWidth?: boolean,
  +borderRadius?: number,
};
const ComposedMessage: React.ComponentType<Props> = React.memo<Props>(
  function ComposedMessage(props) {
    const { item, threadInfo } = props;
    const { creator } = item.messageInfo;
    const { isViewer } = creator;
    const availablePositions = isViewer
      ? availableTooltipPositionsForViewerMessage
      : availableTooltipPositionsForNonViewerMessage;

    const { onMouseLeave, onMouseEnter } = useMessageTooltip({
      item,
      threadInfo,
      availablePositions,
    });

    const shouldShowUsername = !isViewer && item.startsCluster;

    const pushUserProfileModal = usePushUserProfileModal(creator.id);

    assertComposableMessageType(item.messageInfo.type);
    const { shouldDisplayPinIndicator } = props;
    const borderRadius = props.borderRadius ?? 8;
    const { hasBeenEdited, isPinned } = item;
    const { id } = item.messageInfo;
    const threadColor = threadInfo.color;

    const contentClassName = classNames({
      [css.content]: true,
      [css.viewerContent]: isViewer,
      [css.nonViewerContent]: !isViewer,
    });
    const messageBoxContainerClassName = classNames({
      [css.messageBoxContainer]: true,
      [css.fixedWidthMessageBoxContainer]: props.fixedWidth,
    });
    const messageBoxClassName = classNames({
      [css.messageBox]: true,
      [css.fixedWidthMessageBox]: props.fixedWidth,
    });
    const messageBoxStyle = {
      borderTopRightRadius: isViewer && !item.startsCluster ? 0 : borderRadius,
      borderBottomRightRadius: isViewer && !item.endsCluster ? 0 : borderRadius,
      borderTopLeftRadius: !isViewer && !item.startsCluster ? 0 : borderRadius,
      borderBottomLeftRadius: !isViewer && !item.endsCluster ? 0 : borderRadius,
    };

    let authorName = null;
    const stringForUser = useStringForUser(shouldShowUsername ? creator : null);
    if (stringForUser) {
      authorName = (
        <span className={css.authorName} onClick={pushUserProfileModal}>
          {stringForUser}
        </span>
      );
    }

    let deliveryIcon = null;
    let failedSendInfo = null;
    if (isViewer) {
      let deliveryIconSpan;
      let deliveryIconColor = threadColor;

      const notDeliveredP2PMessages =
        item?.localMessageInfo?.outboundP2PMessageIDs ?? [];
      if (
        id !== null &&
        id !== undefined &&
        notDeliveredP2PMessages.length === 0
      ) {
        deliveryIconSpan = <CheckCircleIcon />;
      } else if (props.sendFailed) {
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
      item.threadCreatedFromMessage ||
      Object.keys(item.reactions).length > 0 ||
      label
    ) {
      const positioning = isViewer ? 'right' : 'left';
      inlineEngagement = (
        <div className={css.sidebarMarginBottom}>
          <InlineEngagement
            messageInfo={item.messageInfo}
            threadInfo={threadInfo}
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
        <div className={css.avatarContainer} onClick={pushUserProfileModal}>
          <UserAvatar size="S" userID={creator.id} />
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
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            {pinIcon}
            <div
              className={messageBoxClassName}
              style={messageBoxStyle}
              id={getComposedMessageID(item.messageInfo)}
            >
              {props.children}
            </div>
          </div>
          {deliveryIcon}
        </div>
        {failedSendInfo}
        {inlineEngagement}
      </React.Fragment>
    );
  },
);

export default ComposedMessage;
