// @flow

const paragraphRegex = /^((?:[^\n]*)(?:\n|$))/;
const paragraphStripTrailingNewlineRegex = /^([^\n]*)(?:\n|$)/;

const headingRegex = /^ *(#{1,6}) ([^\n]+?)#* *(?![^\n])/;
const headingStripFollowingNewlineRegex = /^ *(#{1,6}) ([^\n]+?)#* *(?:\n|$)/;

const fenceRegex = /^(`{3,}|~{3,})[^\n]*\n([\s\S]*?\n)\1(?:\n|$)/;
const fenceStripTrailingNewlineRegex = /^(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n\1(?:\n|$)/;

const codeBlockRegex = /^(?: {4}[^\n]*\n*?)+(?!\n* {4}[^\n])(?:\n|$)/;
const codeBlockStripTrailingNewlineRegex = /^((?: {4}[^\n]*\n*?)+)(?!\n* {4}[^\n])(?:\n|$)/;

const blockQuoteRegex = /^( *>[^\n]+(?:\n[^\n]+)*)(?:\n|$)/;
const blockQuoteStripFollowingNewlineRegex = /^( *>[^\n]+(?:\n[^\n]+)*)(?:\n|$){2}/;

const urlRegex = /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/i;

type JSONCapture = {|
  +[0]: string,
  +json: Object,
|};
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

  return {
    [0]: jsonString,
    json,
  };
}

function jsonPrint(capture: JSONCapture): string {
  return JSON.stringify(capture.json, null, '  ');
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
  jsonMatch,
  jsonPrint,
};
