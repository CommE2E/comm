// @flow

const paragraphRegex = /^((?:[^\n]*)(?:\n|$))/;
const paragraphStripTrailingNewlineRegex = /^([^\n]*)(?:\n|$)/;

const urlRegex = /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/i;
const blockQuoteRegex = /^( *>[^\n]+(?:\n[^\n]+)*)/;
const headingRegex = /^ *(#{1,6}) ([^\n]+?)#* *(?![^\n])/;
const codeBlockRegex = /^(?: {4}[^\n]*\n*?)+(?!\n* {4}[^\n])(?:\n|$)/;
const fenceRegex = /^(`{3,}|~{3,})[^\n]*\n([\s\S]*\n)\1(?:\n|$)/;

export {
  paragraphRegex,
  paragraphStripTrailingNewlineRegex,
  urlRegex,
  blockQuoteRegex,
  headingRegex,
  codeBlockRegex,
  fenceRegex,
};
