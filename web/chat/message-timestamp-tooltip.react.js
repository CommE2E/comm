// @flow

import classNames from 'classnames';
import * as React from 'react';

import { isComposableMessageType } from 'lib/types/message-types';
import { longAbsoluteDate } from 'lib/utils/date-utils';

import css from './chat-message-list.css';
import type { OnMessagePositionWithContainerInfo } from './position-types';
import {
  type TooltipPosition,
  tooltipPositions,
  findTooltipPosition,
  sizeOfTooltipArrow,
} from './tooltip-utils';

const availablePositionsForComposedViewerMessage = [
  tooltipPositions.BOTTOM_RIGHT,
];
const availablePositionsForNonComposedOrNonViewerMessage = [
  tooltipPositions.LEFT,
];

type Props = {|
  +messagePositionInfo: OnMessagePositionWithContainerInfo,
  +timeZone: ?string,
|};
function MessageTimestampTooltip(props: Props) {
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

  const tooltipPosition = React.useMemo(
    () =>
      findTooltipPosition({
        pointingToInfo,
        tooltipTexts: [text],
        availablePositions: availableTooltipPositions,
        layoutPosition: 'absolute',
      }),
    [availableTooltipPositions, pointingToInfo, text],
  );
  const { style, className } = React.useMemo(
    () => getTimestampTooltipStyle(messagePositionInfo, tooltipPosition),
    [messagePositionInfo, tooltipPosition],
  );

  return (
    <div
      className={classNames(css.messageTimestampTooltip, className)}
      style={style}
    >
      {text}
    </div>
  );
}

function getTimestampTooltipStyle(
  messagePositionInfo: OnMessagePositionWithContainerInfo,
  tooltipPosition: TooltipPosition,
) {
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
      right: containerWidth - messagePosition.left + sizeOfTooltipArrow,
      top: tooltipPointing,
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
    const tooltipPointing = Math.min(messagePosition.bottom, containerHeight);
    style = {
      right: containerWidth - messagePosition.right,
      top: tooltipPointing + sizeOfTooltipArrow,
    };
    className = css.messageBottomRightTooltip;
  }
  return { style, className };
}

export default MessageTimestampTooltip;
