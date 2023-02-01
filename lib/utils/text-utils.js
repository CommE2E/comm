// @flow

function basePluralize<T>(
  nouns: $ReadOnlyArray<T>,
  maxNumberOfNouns: number = 3,
  composeFunc: (T | string, ?T | string) => T,
): T {
  const baseCase = composeFunc('');

  if (nouns.length === 0 || maxNumberOfNouns <= 0) {
    return baseCase;
  } else if (nouns.length === 1) {
    return nouns[0];
  } else if (maxNumberOfNouns === 1) {
    return composeFunc(`${nouns.length} users`);
  }

  const comma = maxNumberOfNouns > 2 && nouns.length > 2 ? ',' : '';
  if (nouns.length <= maxNumberOfNouns) {
    const allButLast = nouns.slice(0, -1);
    const mostlyComposed = allButLast.reduce(
      (partlyComposed, noun) =>
        composeFunc(composeFunc(partlyComposed, noun), `${comma} `),
      baseCase,
    );
    return composeFunc(
      composeFunc(mostlyComposed, 'and '),
      nouns[nouns.length - 1],
    );
  }
  const explicitNouns = nouns.slice(0, maxNumberOfNouns - 1);
  const mostlyComposed = explicitNouns.reduce(
    (partlyComposed, noun) =>
      composeFunc(composeFunc(partlyComposed, noun), `${comma} `),
    baseCase,
  );
  return composeFunc(
    composeFunc(mostlyComposed, 'and '),
    `${nouns.length - maxNumberOfNouns + 1} others`,
  );
}

function pluralize(
  nouns: $ReadOnlyArray<string>,
  maxNumberOfNouns: number = 3,
): string {
  return basePluralize(nouns, maxNumberOfNouns, (a: string, b: ?string) =>
    b ? a + b : a,
  );
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

export { basePluralize, pluralize, trimText, pluralizeAndTrim };
