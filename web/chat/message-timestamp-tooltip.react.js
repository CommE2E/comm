// @flow

import type { OnMessagePositionInfo } from './message-position-types';
import { isComposableMessageType } from 'lib/types/message-types';

import * as React from 'react';
import invariant from 'invariant';
import classNames from 'classnames';

import { longAbsoluteDate } from 'lib/utils/date-utils';

import { calculateTextWidth } from '../utils/text-utils';
import css from './chat-message-list.css';

type Props = {|
  messagePositionInfo: ?OnMessagePositionInfo,
  timeZone: ?string,
|};
function MessageTimestampTooltip(props: Props) {
  if (!props.messagePositionInfo) {
    return null;
  }
  const { item, messagePosition } = props.messagePositionInfo;
  const text = longAbsoluteDate(item.messageInfo.time, props.timeZone);

  const font =
    '14px -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", ' +
    '"Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", ' +
    '"Helvetica Neue", sans-serif';
  const textWidth = calculateTextWidth(text, font);
  const width = textWidth + 10; // 10px padding
  const sizeOfArrow = 10; // 7px arrow + 3px extra
  const widthWithArrow = width + sizeOfArrow;
  const height = 27; // 17px line-height + 10px padding
  const heightWithArrow = height + sizeOfArrow;

  const { isViewer } = item.messageInfo.creator;
  const isComposed = isComposableMessageType(item.messageInfo.type);
  let align = isComposed && isViewer ? 'right' : 'left';
  if (align === 'right') {
    if (messagePosition.top < 0) {
      align = 'bottom-right';
    } else if (messagePosition.right + width > window.innerWidth) {
      align = 'top-right';
    }
  } else if (align === 'left') {
    if (messagePosition.top < 0) {
      align = 'bottom-left';
    } else if (messagePosition.left - width < 0) {
      align = 'top-left';
    }
  }

  let style, className;
  if (align === 'left') {
    const centerOfMessage = messagePosition.top + messagePosition.height / 2;
    const topOfTooltip = centerOfMessage - height / 2;
    style = {
      left: messagePosition.left - widthWithArrow,
      top: topOfTooltip,
    };
    className = css.messageTimestampLeftTooltip;
  } else if (align === 'right') {
    const centerOfMessage = messagePosition.top + messagePosition.height / 2;
    const topOfTooltip = centerOfMessage - height / 2;
    style = {
      // 10 = 7px arrow + 3px extra
      left: messagePosition.left + messagePosition.width + 10,
      top: topOfTooltip,
    };
    className = css.messageTimestampRightTooltip;
  } else if (align === 'top-left') {
    style = {
      left: messagePosition.left,
      top: messagePosition.top - heightWithArrow,
    };
    className = css.messageTimestampTopLeftTooltip;
  } else if (align === 'top-right') {
    style = {
      left: messagePosition.right - width,
      top: messagePosition.top - heightWithArrow,
    };
    className = css.messageTimestampTopRightTooltip;
  } else if (align === 'bottom-left') {
    style = {
      left: messagePosition.left,
      top: messagePosition.top + messagePosition.height + sizeOfArrow,
    };
    className = css.messageTimestampBottomLeftTooltip;
  } else if (align === 'bottom-right') {
    style = {
      left: messagePosition.right - width,
      top: messagePosition.top + messagePosition.height + sizeOfArrow,
    };
    className = css.messageTimestampBottomRightTooltip;
  }
  invariant(style, 'should be set');

  return (
    <div
      className={classNames(css.messageTimestampTooltip, className)}
      style={style}
    >
      {text}
    </div>
  );
}

export default MessageTimestampTooltip;
