// @flow

import { spoilerRegex } from './markdown.js';

describe('spoilerRegex', () => {
  it('spoilerRegex subject to ^||([^\n]+?)||/', () => {
    expect('|| ||').toMatch(spoilerRegex);
  });

  it('spoilerRegex subject to ^||([^\n]+?)||/', () => {
    expect('|| hello ||').toMatch(spoilerRegex);
  });

  it('spoilerRegex subject to ^||([^\n]+?)||/', () => {
    expect('||SPOILER||').toMatch(spoilerRegex);
  });

  it('spoilerRegex subject to ^||([^\n]+?)||/', () => {
    expect('|| || ||').toMatch(spoilerRegex);
  });

  it('spoilerRegex subject to ^||([^\n]+?)||/', () => {
    expect('||||||').toMatch(spoilerRegex);
  });

  it('spoilerRegex subject to ^||([^\n]+?)||/', () => {
    expect('||SPOILER||SPOILER||').toMatch(spoilerRegex);
  });

  it('spoilerRegex subject to ^||([^\n]+?)||/', () => {
    expect('||\n||').not.toMatch(spoilerRegex);
  });

  it('spoilerRegex subject to ^||([^\n]+?)||/', () => {
    expect('||\r\n||').not.toMatch(spoilerRegex);
  });

  it('spoilerRegex subject to ^||([^\n]+?)||/', () => {
    expect('||||').not.toMatch(spoilerRegex);
  });

  it('spoilerRegex subject to ^||([^\n]+?)||/', () => {
    expect('|| \
    ||').toMatch(spoilerRegex);
  });

  it('spoilerRegex subject to ^||([^\n]+?)||/', () => {
    expect('|| \n\
    ||').not.toMatch(spoilerRegex);
  });
});
