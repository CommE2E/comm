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

export const reactionTooltipStyle = {
  paddingTop: 8,
  paddingBottom: 8,
  paddingLeft: 12,
  paddingRight: 12,
  rowGap: 4,
  maxWidth: 136,
  maxHeight: 162,
};

export const reactionSeeMoreLabel = 'See more';

export const reactionSeeMoreLabelStyle = {
  height: 18,
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

// The editBoxBottomRowHeight is the height of the bottom row in the edit box
// which is the height of the buttons in the bottom row.
export const editBoxBottomRowHeight = 22;

// The editBoxHeight is a height of the all elements of the edit box
// except for the textarea.
// It consists of:
// - 2 * 10px:  .editMessage padding (edit-text-message.css)
// - 10px:      .bottomRow padding between the bottom row buttons
//                and the textarea (edit-text-message.css)
// - 2 * 8px:   .inputBarTextInput padding (chat-input-bar.css)
// - 22px:      height of the bottom row in the edit box (explained above)
// - textarea height which is NOT included here
export const editBoxHeight: number = 3 * 10 + 2 * 8 + editBoxBottomRowHeight;
