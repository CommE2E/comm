// @flow

const newlineRegex: RegExp = /[\r\n]/;
function firstLine(text: ?string): string {
  if (!text) {
    return '';
  }
  return text.split(newlineRegex, 1)[0];
}

export { newlineRegex, firstLine };
