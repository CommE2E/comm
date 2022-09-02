// @flow

import invariant from 'invariant';

import type { RelativeMemberInfo } from '../types/thread-types';
import { oldValidUsernameRegexString } from './account-utils';

// simple-markdown types
export type State = {
  key?: string | number | void,
  inline?: ?boolean,
  quotationsDepth?: number,
  [string]: any,
};

export type Parser = (source: string, state?: ?State) => Array<SingleASTNode>;

export type Capture =
  | (Array<string> & { +index: number, ... })
  | (Array<string> & { +index?: number, ... });

export type SingleASTNode = {
  type: string,
  [string]: any,
};

export type ASTNode = SingleASTNode | Array<SingleASTNode>;

type UnTypedASTNode = {
  [string]: any,
  ...
};

type MatchFunction = { regex?: RegExp, ... } & ((
  source: string,
  state: State,
  prevCapture: string,
) => ?Capture);

export type ReactElement = React$Element<any>;
type ReactElements = React$Node;

export type Output<Result> = (node: ASTNode, state?: ?State) => Result;

type ArrayNodeOutput<Result> = (
  node: Array<SingleASTNode>,
  nestedOutput: Output<Result>,
  state: State,
) => Result;

type ArrayRule = {
  +react?: ArrayNodeOutput<ReactElements>,
  +html?: ArrayNodeOutput<string>,
  +[string]: ArrayNodeOutput<any>,
};

type ParseFunction = (
  capture: Capture,
  nestedParse: Parser,
  state: State,
) => UnTypedASTNode | ASTNode;

type ParserRule = {
  +order: number,
  +match: MatchFunction,
  +quality?: (capture: Capture, state: State, prevCapture: string) => number,
  +parse: ParseFunction,
  ...
};

export type ParserRules = {
  +Array?: ArrayRule,
  +[type: string]: ParserRule,
  ...
};

const paragraphRegex: RegExp = /^((?:[^\n]*)(?:\n|$))/;
const paragraphStripTrailingNewlineRegex: RegExp = /^([^\n]*)(?:\n|$)/;

const headingRegex: RegExp = /^ *(#{1,6}) ([^\n]+?)#* *(?![^\n])/;
const headingStripFollowingNewlineRegex: RegExp = /^ *(#{1,6}) ([^\n]+?)#* *(?:\n|$)/;

const fenceRegex: RegExp = /^(`{3,}|~{3,})[^\n]*\n([\s\S]*?\n)\1(?:\n|$)/;
const fenceStripTrailingNewlineRegex: RegExp = /^(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n\1(?:\n|$)/;

const codeBlockRegex: RegExp = /^(?: {4}[^\n]*\n*?)+(?!\n* {4}[^\n])(?:\n|$)/;
const codeBlockStripTrailingNewlineRegex: RegExp = /^((?: {4}[^\n]*\n*?)+)(?!\n* {4}[^\n])(?:\n|$)/;

const blockQuoteRegex: RegExp = /^( *>[^\n]+(?:\n[^\n]+)*)(?:\n|$)/;
const blockQuoteStripFollowingNewlineRegex: RegExp = /^( *>[^\n]+(?:\n[^\n]+)*)(?:\n|$){2}/;
const maxNestedQuotations = 5;

const urlRegex: RegExp = /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/i;

const mentionRegex = new RegExp(`^(@(${oldValidUsernameRegexString}))\\b`);

export type JSONCapture = Array<string> & {
  +json: Object,
  +index?: void,
  ...
};
function jsonMatch(source: string): ?JSONCapture {
  if (!source.startsWith('{')) {
    return null;
  }

  let jsonString = '';
  let counter = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    jsonString += char;
    if (char === '{') {
      counter++;
    } else if (char === '}') {
      counter--;
    }
    if (counter === 0) {
      break;
    }
  }
  if (counter !== 0) {
    return null;
  }

  let json;
  try {
    json = JSON.parse(jsonString);
  } catch {
    return null;
  }
  if (!json || typeof json !== 'object') {
    return null;
  }

  return { ...([jsonString]: any), json };
}

function jsonPrint(capture: JSONCapture): string {
  return JSON.stringify(capture.json, null, '  ');
}

const listRegex = /^( *)([*+-]|\d+\.) ([\s\S]+?)(?:\n{2}|\s*\n*$)/;
const listItemRegex = /^( *)([*+-]|\d+\.) [^\n]*(?:\n(?!\1(?:[*+-]|\d+\.) )[^\n]*)*(\n|$)/gm;
const listItemPrefixRegex = /^( *)([*+-]|\d+\.) /;
const listLookBehindRegex = /(?:^|\n)( *)$/;

function matchList(source: string, state: State): RegExp$matchResult | null {
  if (state.inline) {
    return null;
  }
  const prevCaptureStr = state.prevCapture ? state.prevCapture[0] : '';
  const isStartOfLineCapture = listLookBehindRegex.exec(prevCaptureStr);
  if (!isStartOfLineCapture) {
    return null;
  }
  const fullSource = isStartOfLineCapture[1] + source;
  return listRegex.exec(fullSource);
}

// We've defined our own parse function for lists because simple-markdown
// handles newlines differently. Outside of that our implementation is fairly
// similar. For more details about list parsing works, take a look at the
// comments in the simple-markdown package
function parseList(
  capture: Capture,
  parse: Parser,
  state: State,
): UnTypedASTNode {
  const bullet = capture[2];
  const ordered = bullet.length > 1;
  const start = ordered ? Number(bullet) : undefined;
  const items = capture[0].match(listItemRegex);

  let itemContent = null;
  if (items) {
    itemContent = items.map((item: string) => {
      const prefixCapture = listItemPrefixRegex.exec(item);
      const space = prefixCapture ? prefixCapture[0].length : 0;
      const spaceRegex = new RegExp('^ {1,' + space + '}', 'gm');
      const content: string = item
        .replace(spaceRegex, '')
        .replace(listItemPrefixRegex, '');
      // We're handling this different than simple-markdown -
      // each item is a paragraph
      return parse(content, state);
    });
  }

  return {
    ordered: ordered,
    start: start,
    items: itemContent,
  };
}

function matchMentions(
  members: $ReadOnlyArray<RelativeMemberInfo>,
): MatchFunction {
  const memberSet = new Set(
    members
      .filter(({ role }) => role)
      .map(({ username }) => username?.toLowerCase())
      .filter(Boolean),
  );
  const match = (source: string, state: State) => {
    if (!state.inline) {
      return null;
    }
    const result = mentionRegex.exec(source);
    if (!result) {
      return null;
    }
    const username = result[2];
    invariant(username, 'mentionRegex should match two capture groups');
    if (!memberSet.has(username.toLowerCase())) {
      return null;
    }
    return result;
  };
  match.regex = mentionRegex;
  return match;
}

export {
  paragraphRegex,
  paragraphStripTrailingNewlineRegex,
  urlRegex,
  blockQuoteRegex,
  blockQuoteStripFollowingNewlineRegex,
  headingRegex,
  headingStripFollowingNewlineRegex,
  codeBlockRegex,
  codeBlockStripTrailingNewlineRegex,
  fenceRegex,
  fenceStripTrailingNewlineRegex,
  maxNestedQuotations,
  jsonMatch,
  jsonPrint,
  matchList,
  parseList,
  matchMentions,
};
