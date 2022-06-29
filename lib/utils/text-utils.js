// @flow

function pluralize(
  nouns: $ReadOnlyArray<string>,
  maxNumberOfNouns: number = 3,
): string {
  if (nouns.length === 0 || maxNumberOfNouns <= 0) {
    return '';
  } else if (nouns.length === 1) {
    return nouns[0];
  } else if (maxNumberOfNouns === 1) {
    return `${nouns.length} users`;
  }

  const comma = maxNumberOfNouns > 2 && nouns.length > 2 ? ',' : '';
  if (nouns.length <= maxNumberOfNouns) {
    const prefix = nouns.slice(0, -1).join(', ');
    return `${prefix}${comma} and ${nouns[nouns.length - 1]}`;
  }
  const prefix = nouns.slice(0, maxNumberOfNouns - 1).join(', ');
  return `${prefix}${comma} and ${nouns.length - maxNumberOfNouns + 1} others`;
}

function trimText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  } else if (maxLength <= 3) {
    return text.substring(0, maxLength);
  }
  return `${text.substring(0, maxLength - 3)}...`;
}

function pluralizeAndTrim(
  nouns: $ReadOnlyArray<string>,
  maxLength: number,
): string {
  for (let maxNumberOfNouns = 3; maxNumberOfNouns >= 2; --maxNumberOfNouns) {
    const text = pluralize(nouns, maxNumberOfNouns);
    if (text.length <= maxLength) {
      return text;
    }
  }
  return trimText(pluralize(nouns, 1), maxLength);
}

export { pluralize, trimText, pluralizeAndTrim };
