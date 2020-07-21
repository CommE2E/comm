// @flow

const urlRegex = /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/i;
const paragraphRegex = /^((?:[^\n]*)(?:\n|$))/;
const blockQuoteRegex = /^( *>[^\n]+(?:\n[^\n]+)*)(?:\n\n|$)/;
const headingRegex = /^ *(#{1,6}) ([^\n]+?)#* *(?:\n|$)/;
const codeBlockRegex = /^(?: {4}[^\n]+\n*)+(?:\n *)/;
const fenceRegex = /^(`{3,}|~{3,})(?:\n)?([\s\S]*)\1(?:\n|$)/;

export {
  urlRegex,
  paragraphRegex,
  blockQuoteRegex,
  headingRegex,
  codeBlockRegex,
  fenceRegex,
};
