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
      textPrefix: '',
      mentionText: 'mention123',
    },
    {
      textPrefix: '',
      mentionText: 'mention with space',
    },
    {
      textPrefix: 'text prefix ',
      mentionText: 'mention with space',
    },
    {
      textPrefix: 'This is a test ',
      mentionText: 'mention',
    },
    {
      textPrefix: '',
      mentionText: '',
    },
    {
      textPrefix: 'A multi-line\nmention with\nnewlines ',
      mentionText: 'mention',
    },
    {
      textPrefix: 'text @first mention ',
      mentionText: 'second mention',
    },
    {
      textPrefix: 'text text \n@first \n',
      mentionText: 'second mention',
    },
  ];

  it('should match webMentionTypeaheadRegex', () =>
    validMatches.forEach(validMatchObject => {
      const text = `${validMatchObject.textPrefix}@${validMatchObject.mentionText}`;
      const match = text.match(webMentionTypeaheadRegex);
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

  it('should not match webMentionTypeaheadRegex', () =>
    invalidMatches.forEach(text =>
      expect(text.match(webMentionTypeaheadRegex)).toBeFalsy(),
    ));
});
