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

    const contentClassName = React.useMemo(
      () =>
        classNames({
          [css.content]: true,
          [css.viewerContent]: isViewer,
          [css.nonViewerContent]: !isViewer,
        }),
      [isViewer],
    );
    const messageBoxContainerClassName = React.useMemo(
      () =>
        classNames({
          [css.messageBoxContainer]: true,
          [css.fixedWidthMessageBoxContainer]: props.fixedWidth,
        }),
      [props.fixedWidth],
    );
    const messageBoxClassName = React.useMemo(
      () =>
        classNames({
          [css.messageBox]: true,
          [css.fixedWidthMessageBox]: props.fixedWidth,
        }),
      [props.fixedWidth],
    );
    const messageBoxStyle = React.useMemo(
      () => ({
        borderTopRightRadius:
          isViewer && !item.startsCluster ? 0 : borderRadius,
        borderBottomRightRadius:
          isViewer && !item.endsCluster ? 0 : borderRadius,
        borderTopLeftRadius:
          !isViewer && !item.startsCluster ? 0 : borderRadius,
        borderBottomLeftRadius:
          !isViewer && !item.endsCluster ? 0 : borderRadius,
      }),
      [isViewer, item.startsCluster, item.endsCluster, borderRadius],
    );

    const stringForUser = useStringForUser(shouldShowUsername ? creator : null);
    const authorName = React.useMemo(() => {
      if (!stringForUser) {
        return null;
      }
      return (
        <span className={css.authorName} onClick={pushUserProfileModal}>
          {stringForUser}
        </span>
      );
    }, [stringForUser, pushUserProfileModal]);

    const notDeliveredP2PMessages =
      item?.localMessageInfo?.outboundP2PMessageIDs;
    const { deliveryIcon, failedSendInfo } = React.useMemo(() => {
      if (!isViewer) {
        return { deliveryIcon: null, failedSendInfo: null };
      }

      let returnedFailedSendInfo, deliveryIconSpan;
      let deliveryIconColor = threadColor;
      if (
        id !== null &&
        id !== undefined &&
        (!notDeliveredP2PMessages || notDeliveredP2PMessages.length === 0)
      ) {
        deliveryIconSpan = <CheckCircleIcon />;
      } else if (props.sendFailed) {
        deliveryIconSpan = <XCircleIcon />;
        deliveryIconColor = 'FF0000';
        returnedFailedSendInfo = (
          <FailedSend item={item} threadInfo={threadInfo} />
        );
      } else {
        deliveryIconSpan = <CircleIcon />;
      }

      const returnedDeliveryIcon = (
        <div
          className={css.iconContainer}
          style={{ color: `#${deliveryIconColor}` }}
        >
          {deliveryIconSpan}
        </div>
      );
      return {
        deliveryIcon: returnedDeliveryIcon,
        failedSendInfo: returnedFailedSendInfo,
      };
    }, [
      isViewer,
      threadColor,
      id,
      notDeliveredP2PMessages,
      props.sendFailed,
      item,
      threadInfo,
    ]);

    const label = getMessageLabel(hasBeenEdited, threadInfo.id);
    const inlineEngagement = React.useMemo(() => {
      if (
        !item.threadCreatedFromMessage &&
        Object.keys(item.reactions).length === 0 &&
        !label
      ) {
        return null;
      }
      const positioning = isViewer ? 'right' : 'left';
      return (
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
    }, [
      item.threadCreatedFromMessage,
      item.reactions,
      label,
      isViewer,
      item.messageInfo,
      threadInfo,
    ]);

    const avatar = React.useMemo(() => {
      if (!isViewer && item.endsCluster) {
        return (
          <div className={css.avatarContainer} onClick={pushUserProfileModal}>
            <UserAvatar size="S" userID={creator.id} />
          </div>
        );
      } else if (!isViewer) {
        return <div className={css.avatarOffset} />;
      }
      return undefined;
    }, [isViewer, item.endsCluster, pushUserProfileModal, creator.id]);

    const shouldShowPinIcon = isPinned && shouldDisplayPinIndicator;
    const pinIcon = React.useMemo(() => {
      if (!shouldShowPinIcon) {
        return null;
      }
      const pinIconPositioning = isViewer ? 'left' : 'right';
      const pinIconName = pinIconPositioning === 'left' ? 'pin-mirror' : 'pin';
      const pinIconContainerClassName = classNames({
        [css.pinIconContainer]: true,
        [css.pinIconLeft]: pinIconPositioning === 'left',
        [css.pinIconRight]: pinIconPositioning === 'right',
      });
      return (
        <div
          className={pinIconContainerClassName}
          style={{ color: `#${threadColor}` }}
        >
          <CommIcon icon={pinIconName} size={12} />
        </div>
      );
    }, [shouldShowPinIcon, isViewer, threadColor]);

    const composedMessageID = getComposedMessageID(item.messageInfo);
    return React.useMemo(
      () => (
        <>
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
                id={composedMessageID}
              >
                {props.children}
              </div>
            </div>
            {deliveryIcon}
          </div>
          {failedSendInfo}
          {inlineEngagement}
        </>
      ),
      [
        authorName,
        contentClassName,
        avatar,
        messageBoxContainerClassName,
        onMouseEnter,
        onMouseLeave,
        pinIcon,
        messageBoxClassName,
        messageBoxStyle,
        composedMessageID,
        props.children,
        deliveryIcon,
        failedSendInfo,
        inlineEngagement,
      ],
    );
  },
);

export default ComposedMessage;
