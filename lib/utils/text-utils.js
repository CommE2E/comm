// @flow

function pluralize(nouns: string[]): string {
  if (nouns.length === 1) {
    return nouns[0];
  } else if (nouns.length === 2) {
    return `${nouns[0]} and ${nouns[1]}`;
  } else if (nouns.length === 3) {
    return `${nouns[0]}, ${nouns[1]}, and ${nouns[2]}`;
  } else {
    return `${nouns[0]}, ${nouns[1]}, and ${nouns.length - 2} others`;
  }
}

function trimText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substr(0, maxLength - 3) + '...';
}

export { pluralize, trimText };
