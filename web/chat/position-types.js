// @flow

import { type ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';

export type OnMessagePositionWithContainerInfo = {
  +type: 'on',
  +item: ChatMessageInfoItem,
  +messagePosition: PositionInfo,
  +containerPosition: PositionInfo,
};

export type OnMessagePositionInfo = {
  +type: 'on',
  +item: ChatMessageInfoItem,
  +messagePosition: PositionInfo,
};

export type MessagePositionInfo =
  | OnMessagePositionInfo
  | {
      +type: 'off',
      +item: ChatMessageInfoItem,
    };

export type ItemAndContainerPositionInfo = {
  +itemPosition: PositionInfo,
  +containerPosition: PositionInfo,
};

export type PositionInfo = {
  +top: number,
  +bottom: number,
  +left: number,
  +right: number,
  +width: number,
  +height: number,
};
