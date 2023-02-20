// @flow

import { spoilerRegex } from './markdown.js';

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
