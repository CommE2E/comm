// @flow

import invariant from 'invariant';
import * as React from 'react';

import { isComposableMessageType } from 'lib/types/message-types';
import { longAbsoluteDate } from 'lib/utils/date-utils';

import css from './message-timestamp-tooltip.css';
import type { OnMessagePositionWithContainerInfo } from './position-types';
import {
  type TooltipPosition,
  tooltipPositions,
  sizeOfTooltipArrow,
} from './tooltip-utils';
import {
  TooltipMenu,
  type TooltipStyle,
  TooltipTextItem,
} from './tooltip.react';

const availablePositionsForComposedViewerMessage = [tooltipPositions.LEFT];
const availablePositionsForNonComposedOrNonViewerMessage = [
  tooltipPositions.BOTTOM_RIGHT,
];

type Props = {
  +messagePositionInfo: OnMessagePositionWithContainerInfo,
  +timeZone: ?string,
};
function MessageTimestampTooltip(props: Props): React.Node {
  const { messagePositionInfo, timeZone } = props;
  const { time, creator, type } = messagePositionInfo.item.messageInfo;

  const text = React.useMemo(() => longAbsoluteDate(time, timeZone), [
    time,
    timeZone,
  ]);
  const availableTooltipPositions = React.useMemo(() => {
    const { isViewer } = creator;
    const isComposed = isComposableMessageType(type);
    return isComposed && isViewer
      ? availablePositionsForComposedViewerMessage
      : availablePositionsForNonComposedOrNonViewerMessage;
  }, [creator, type]);

  const { messagePosition, containerPosition } = messagePositionInfo;
  const pointingToInfo = React.useMemo(() => {
    return {
      containerPosition,
      itemPosition: messagePosition,
    };
  }, [messagePosition, containerPosition]);

  const getTooltipStyle = React.useCallback(
    (tooltipPosition: TooltipPosition) =>
      getTimestampTooltipStyle(messagePositionInfo, tooltipPosition),
    [messagePositionInfo],
  );
  return (
    <TooltipMenu
      availableTooltipPositions={availableTooltipPositions}
      targetPositionInfo={pointingToInfo}
      layoutPosition="absolute"
      getStyle={getTooltipStyle}
    >
      <TooltipTextItem text={text} />
    </TooltipMenu>
  );
}

function getTimestampTooltipStyle(
  messagePositionInfo: OnMessagePositionWithContainerInfo,
  tooltipPosition: TooltipPosition,
): TooltipStyle {
  const { messagePosition, containerPosition } = messagePositionInfo;
  const { height: containerHeight, width: containerWidth } = containerPosition;

  let style, className;
  if (tooltipPosition === tooltipPositions.LEFT) {
    const centerOfMessage = messagePosition.top + messagePosition.height / 2;
    const tooltipPointing = Math.max(
      Math.min(centerOfMessage, containerHeight),
      0,
    );
    style = {
      right: containerWidth - messagePosition.left + sizeOfTooltipArrow + 2,
      bottom: containerHeight - tooltipPointing - 5 * sizeOfTooltipArrow,
    };
    className = css.messageLeftTooltip;
  } else if (tooltipPosition === tooltipPositions.RIGHT) {
    const centerOfMessage = messagePosition.top + messagePosition.height / 2;
    const tooltipPointing = Math.max(
      Math.min(centerOfMessage, containerHeight),
      0,
    );
    style = {
      left: messagePosition.right + sizeOfTooltipArrow,
      top: tooltipPointing,
    };
    className = css.messageRightTooltip;
  } else if (tooltipPosition === tooltipPositions.TOP_LEFT) {
    const tooltipPointing = Math.min(
      containerHeight - messagePosition.top,
      containerHeight,
    );
    style = {
      left: messagePosition.left,
      bottom: tooltipPointing + sizeOfTooltipArrow,
    };
    className = css.messageTopLeftTooltip;
  } else if (tooltipPosition === tooltipPositions.TOP_RIGHT) {
    const tooltipPointing = Math.min(
      containerHeight - messagePosition.top,
      containerHeight,
    );
    style = {
      right: containerWidth - messagePosition.right,
      bottom: tooltipPointing + sizeOfTooltipArrow,
    };
    className = css.messageTopRightTooltip;
  } else if (tooltipPosition === tooltipPositions.BOTTOM_LEFT) {
    const tooltipPointing = Math.min(messagePosition.bottom, containerHeight);
    style = {
      left: messagePosition.left,
      top: tooltipPointing + sizeOfTooltipArrow,
    };
    className = css.messageBottomLeftTooltip;
  } else if (tooltipPosition === tooltipPositions.BOTTOM_RIGHT) {
    const centerOfMessage = messagePosition.top + messagePosition.height / 2;
    const tooltipPointing = Math.max(
      Math.min(centerOfMessage, containerHeight),
      0,
    );
    style = {
      left: messagePosition.right + sizeOfTooltipArrow + 2,
      bottom: containerHeight - tooltipPointing - 5 * sizeOfTooltipArrow,
    };
    className = css.messageBottomRightTooltip;
  }
  invariant(
    className && style,
    `${tooltipPosition} is not valid for timestamp tooltip`,
  );
  return { className, style };
}

export default MessageTimestampTooltip;
