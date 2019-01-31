// @flow

import type { MessagePositionInfo } from './message.react';

import * as React from 'react';

import { longAbsoluteDate } from 'lib/utils/date-utils';

import css from './chat-message-list.css';

type Props = {|
  messagePositionInfo: ?MessagePositionInfo,
|};
function MessageTimestampTooltip(props: Props) {
  if (!props.messagePositionInfo) {
    return null;
  }
  const { item, messagePosition } = props.messagePositionInfo;
  const style = { left: messagePosition.left, top: messagePosition.top };
  return (
    <div className={css.messageTimestampTooltip} style={style}>
      {longAbsoluteDate(item.messageInfo.time)}
    </div>
  );
}

export default MessageTimestampTooltip;
