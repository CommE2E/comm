// @flow

import { typeaheadStyle } from '../chat/chat-constants.js';
import { getTypeaheadOverlayScroll } from './typeahead-utils.js';

describe('getTypeaheadOverlayScroll', () => {
  it(
    'should return the same scroll position when' +
      'it is already scrolled to the top and changing between 2nd button',
    () => expect(getTypeaheadOverlayScroll(0, 1)).toEqual(0),
  );

  it(
    'should scroll down when it is scrolled to the top' +
      'and changing to button out of screen',
    () =>
      expect(getTypeaheadOverlayScroll(0, 6)).toEqual(
        (6 + 1) * typeaheadStyle.rowHeight +
          typeaheadStyle.tooltipVerticalPadding -
          typeaheadStyle.tooltipMaxHeight,
      ),
  );

  it(
    'should scroll up when it is scrolled somewhere down' +
      'and changing to button out of screen to the top',
    () =>
      expect(getTypeaheadOverlayScroll(500, 3)).toEqual(
        3 * typeaheadStyle.rowHeight,
      ),
  );
});
