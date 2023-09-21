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
  const validMatches = [
    {
      text: '@mention123',
      textPrefix: '',
      mentionText: 'mention123',
    },
    {
      text: '@mention with space',
      textPrefix: '',
      mentionText: 'mention with space',
    },
    {
      text: 'text prefix @mention with space',
      textPrefix: 'text prefix ',
      mentionText: 'mention with space',
    },
    {
      text: 'This is a test @mention',
      textPrefix: 'This is a test ',
      mentionText: 'mention',
    },
    {
      text: '@',
      textPrefix: '',
      mentionText: '',
    },
    {
      text: 'A multi-line\nmention with\nnewlines @mention',
      textPrefix: 'A multi-line\nmention with\nnewlines ',
      mentionText: 'mention',
    },
    {
      text: 'text @first mention @second mention',
      textPrefix: 'text @first mention ',
      mentionText: 'second mention',
    },
    {
      text: 'text text \n@first \n@second mention',
      textPrefix: 'text text \n@first \n',
      mentionText: 'second mention',
    },
  ];

  it('should match valid mentions', () =>
    validMatches.forEach(validMatchObject => {
      const match = validMatchObject.text.match(webMentionTypeaheadRegex);
      expect(match).toBeTruthy();
      expect(match?.groups?.textPrefix ?? '').toEqual(
        validMatchObject.textPrefix,
      );
      expect(match?.groups?.mentionText ?? '').toEqual(
        validMatchObject.mentionText,
      );
    }));

  const invalidMatches = [
    'This is not a valid text with mention',
    `@${'a'.repeat(200)} `,
    'text prefix\\@mention',
    '@mention\nnewline \\@mention with space',
    '\\@',
    '\\@username',
    '\\@thread with spaces',
  ];

  it('should not match invalid mentions', () =>
    invalidMatches.forEach(text =>
      expect(text.match(webMentionTypeaheadRegex)).toBeFalsy(),
    ));
});
