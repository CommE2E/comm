// @flow

import { spoilerRegex } from './markdown.js';
import { chatMentionRegex } from './mention-utils.js';

// Each of the below tests is subject to the following RegEx pattern:
// Spoiler RegEx: /^\|\|([^\n]+?)\|\|/g

describe('spoilerRegex', () => {
  it('We expect a spoiler with a single space character to match.', () => {
    expect('|| ||').toMatch(spoilerRegex);
  });

  it('We expect a spoiler with regular text + spaces to match (1).', () => {
    expect('|| hello ||').toMatch(spoilerRegex);
  });

  it('We expect a spoiler with regular text + spaces to match (2).', () => {
    expect('||SPOILER||').toMatch(spoilerRegex);
  });

  it('We expect a spoiler containing any number of || within it to match (1).', () => {
    expect('|| || ||').toMatch(spoilerRegex);
  });

  it('We expect a spoiler containing any number of || within it to match (2).', () => {
    expect('||||||').toMatch(spoilerRegex);
  });

  it('We expect a spoiler containing any number of || within it, as well as regular text + spaces, to match.', () => {
    expect('||SPOILER||SPOILER||').toMatch(spoilerRegex);
  });

  it('We do not expect a spoiler containing a new line character to match (1).', () => {
    expect('||\n||').not.toMatch(spoilerRegex);
  });

  it('We do not expect a spoiler containing a new line character to match (2).', () => {
    expect('||\r\n||').not.toMatch(spoilerRegex);
  });

  it('We do not expect an empty spoiler to match.', () => {
    expect('||||').not.toMatch(spoilerRegex);
  });

  it('We expect a spoiler containing a single space to match, even when split across multiple lines.', () => {
    expect(
      '|| \
    ||',
    ).toMatch(spoilerRegex);
  });

  it('We do not expect a spoiler containing a new line character to match (3).', () => {
    expect(
      '|| \n\
    ||',
    ).not.toMatch(spoilerRegex);
  });

  it("We expect to extract 'hello' from the following spoiler: ||hello||", () => {
    const spoiler = '||hello||';
    const extracted = spoiler.match(spoilerRegex);
    expect(extracted ? extracted[0] : null).toMatch('hello');
  });

  it("We expect to extract '||' from the following spoiler: ||||||", () => {
    const spoiler = '||||||';
    const extracted = spoiler.match(spoilerRegex);
    expect(extracted ? extracted[0] : null).toMatch('||');
  });

  it("We expect to extract ' ' from the following spoiler: || || ||", () => {
    const spoiler = '|| || ||';
    const extracted = spoiler.match(spoilerRegex);
    expect(extracted ? extracted[0] : null).toMatch(' ');
  });

  it("We expect to extract '||THISISASPOILER||' from the following spoiler: ||||THISISASPOILER||||", () => {
    const spoiler = '||||THISISASPOILER||||';
    const extracted = spoiler.match(spoilerRegex);
    expect(extracted ? extracted[0] : null).toMatch('||THISISASPOILER||');
  });

  it("We expect to extract '' from the following spoiler: || \\|\\| ||", () => {
    const spoiler = '|| \\|\\| ||';
    const extracted = spoiler.match(spoilerRegex);
    expect(extracted ? extracted[0] : null).toMatch(' \\|\\| ');
  });
});

// Each of the below tests is subject to the following RegEx pattern:
// Chat mention RegEx:
// (?<!\\)(@\[\[(${idSchemaRegex}):(.{1,${chatNameMaxLength}?)(?<!\\)\]\])

describe('chatMentionRegex', () => {
  it('We do not expect an empty raw chat mention to match.', () => {
    expect('@[[:]]').not.toMatch(chatMentionRegex);
    expect('@[[]]').not.toMatch(chatMentionRegex);
  });

  it('We do not expect a raw chat mention with invalid id to match.', () => {
    expect('@[[|:]]').not.toMatch(chatMentionRegex);
    expect('@[[256|:hello]]').not.toMatch(chatMentionRegex);
    expect('@[[foo:]]').not.toMatch(chatMentionRegex);
    expect('@[[:bar]]').not.toMatch(chatMentionRegex);
    expect('@[[|:bar]]').not.toMatch(chatMentionRegex);
    expect('@[[foo:bar]]').not.toMatch(chatMentionRegex);
  });

  it('We do not expect to match raw chat mention with valid id and without text.', () => {
    expect('@[[1:]]').not.toMatch(chatMentionRegex);
    expect('@[[256|1:]]').not.toMatch(chatMentionRegex);
  });

  it('We do expect to match raw chat mention with valid id and text.', () => {
    expect('@[[1:test]]').toMatch(chatMentionRegex);
    expect('@[[256|1:test]]').toMatch(chatMentionRegex);
  });

  it('We do expect to match properly closed raw chat mention.', () => {
    expect('@[[256|1:bar \\] \\]]]').toMatch(chatMentionRegex);
  });

  it('We do not expect to match improperly closed raw chat mention.', () => {
    expect('@[[256|1:bar \\]]').not.toMatch(chatMentionRegex);
    expect('@[[256|1:bar \\] \\]]').not.toMatch(chatMentionRegex);
    expect('@[[256|1:bar] ]').not.toMatch(chatMentionRegex);
  });

  it('We do not expect to match raw chat mention with escaped @ char.', () => {
    expect('\\@[[1:bar]]').not.toMatch(chatMentionRegex);
  });

  it('We do expect to match raw chat mention with escaped chars in default text field.', () => {
    expect('@[[256|1:\\@\\[\\[1:test\\]\\] ]]').toMatch(chatMentionRegex);
  });

  it('We do not expect an invalid raw chat mention format to match.', () => {
    expect('@[256|1:test]').not.toMatch(chatMentionRegex);
    expect('@test').not.toMatch(chatMentionRegex);
    expect('@[256|1:test]]').not.toMatch(chatMentionRegex);
    expect('@[[256|1:test]').not.toMatch(chatMentionRegex);
  });
});
