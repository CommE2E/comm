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
};
