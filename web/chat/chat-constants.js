// @flow

import { messageKey } from 'lib/shared/message-utils.js';
import type { MessageInfo } from 'lib/types/message-types.js';

import type { ComposedMessageID } from './composed-message.react.js';

export const tooltipStyle = {
  paddingLeft: 5,
  paddingRight: 5,
  rowGap: 3,
};

export const tooltipLabelStyle = {
  padding: 6,
  height: 20,
};
export const tooltipButtonStyle = {
  paddingLeft: 6,
  paddingRight: 6,
  width: 30,
  height: 38,
};

export const typeaheadStyle = {
  tooltipWidth: 296,
  tooltipMaxHeight: 268,
  tooltipVerticalPadding: 16,
  tooltipLeftOffset: 16,
  tooltipTopOffset: 4,
  rowHeight: 40,
};

export const getComposedMessageID = (
  messageInfo: MessageInfo,
): ComposedMessageID => {
  return `ComposedMessageBox-${messageKey(messageInfo)}`;
};

export const defaultMaxTextAreaHeight = 150;

export const editBoxBottomRowHeight = 22;

export const editBoxTopMargin = 10;
export const editBoxHeight: number = 3 * 10 + 2 * 8 + editBoxBottomRowHeight;
