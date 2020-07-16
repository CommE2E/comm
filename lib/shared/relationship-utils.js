// @flow

function sortIDs(firstId: string, secondId: string): number[] {
  return [Number(firstId), Number(secondId)].sort((a, b) => a - b);
}

export { sortIDs };
