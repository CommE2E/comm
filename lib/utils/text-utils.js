// @flow

function pluralize(
  nouns: $ReadOnlyArray<string>,
  maxNumberOfNouns: number = 3,
): string {
  if (nouns.length === 0) {
    return '';
  } else if (nouns.length === 1) {
    return nouns[0];
  } else if (maxNumberOfNouns === 1) {
    return `${nouns.length} ${nouns.length > 1 ? 'users' : 'user'}`;
  }

  const comma = maxNumberOfNouns > 2 && nouns.length > 2 ? ',' : '';
  if (nouns.length <= maxNumberOfNouns) {
    const prefix = nouns.slice(0, nouns.length - 1).join(', ');
    return `${prefix}${comma} and ${nouns[nouns.length - 1]}`;
  } else {
    const prefix = nouns.slice(0, maxNumberOfNouns - 1).join(', ');
    return `${prefix}${comma} and ${
      nouns.length - maxNumberOfNouns + 1
    } others`;
  }
}

function trimText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substr(0, maxLength - 3) + '...';
}

export { pluralize, trimText };
