// @flow

function sortIDs(firstId: string, secondId: string): string[] {
  return [Number(firstId), Number(secondId)]
    .sort((a, b) => a - b)
    .map(num => num.toString());
}

export { sortIDs };
