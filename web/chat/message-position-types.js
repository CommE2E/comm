// @flow

import {
  type ChatMessageInfoItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';

import PropTypes from 'prop-types';

export const onMessagePositionInfoPropType = PropTypes.exact({
  type: PropTypes.oneOf(['on']).isRequired,
  item: chatMessageItemPropType.isRequired,
  messagePosition: PropTypes.exact({
    top: PropTypes.number.isRequired,
    bottom: PropTypes.number.isRequired,
    left: PropTypes.number.isRequired,
    right: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
  }),
});

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
