// @flow

import {
  getTypeaheadOverlayScroll,
  webMentionTypeaheadRegex,
} from './typeahead-utils.js';
import { typeaheadStyle } from '../chat/chat-constants.js';

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

describe('webMentionTypeaheadRegex', () => {
  it('should match @username', () => {
    expect('@username').toMatch(webMentionTypeaheadRegex);
  });

  it('should match @thread name with spaces', () => {
    expect('@thread name with spaces').toMatch(webMentionTypeaheadRegex);
  });

  it('should match @', () => {
    expect('@').toMatch(webMentionTypeaheadRegex);
  });

  it('should not match escaped @ mention', () => {
    expect('\\@').not.toMatch(webMentionTypeaheadRegex);
    expect('\\@username').not.toMatch(webMentionTypeaheadRegex);
    expect('\\@thread with spaces').not.toMatch(webMentionTypeaheadRegex);
  });

  it('should not match mention longer than limits set in chat name regex', () => {
    const longString = `@${'a'.repeat(200)} `;
    expect(longString).not.toMatch(webMentionTypeaheadRegex);
  });
});
