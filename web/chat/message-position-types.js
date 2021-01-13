// @flow

import { type ChatMessageInfoItem } from 'lib/selectors/chat-selectors';

export type OnMessagePositionInfo = {|
  +type: 'on',
  +item: ChatMessageInfoItem,
  +messagePosition: {|
    +top: number,
    +bottom: number,
    +left: number,
    +right: number,
    +height: number,
    +width: number,
  |},
|};

export type MessagePositionInfo =
  | OnMessagePositionInfo
  | {|
      +type: 'off',
      +item: ChatMessageInfoItem,
    |};
