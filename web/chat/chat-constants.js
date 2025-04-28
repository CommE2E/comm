// @flow

import { messageKey } from 'lib/shared/id-utils.js';
import type { MessageInfo } from 'lib/types/message-types.js';

import type { ComposedMessageID } from './composed-message.react.js';

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
