// @flow

function getAllTuples<T>([head, ...tail]: $ReadOnlyArray<T>): Array<[T, T]> {
  if (tail.length > 0) {
    return [...tail.map(tailValue => [head, tailValue]), ...getAllTuples(tail)];
  }
  return [];
}

function cartesianProduct<R, C>(
  rows: $ReadOnlyArray<R>,
  columns: $ReadOnlyArray<C>,
): Array<[R, C]> {
  return rows.reduce((acc, rowValue) => {
    acc.push(...columns.map(columnValue => [rowValue, columnValue]));
    return acc;
  }, []);
}

function pushAll<T>(pushInto: Array<T>, pushFrom: $ReadOnlyArray<T>): void {
  for (const val of pushFrom) {
    pushInto.push(val);
  }
}

function splitIntoChunks<T>(
  array: $ReadOnlyArray<T>,
  batchSize: number,
): T[][] {
  const chunks = [];

  let i = 0;
  while (i < array.length) {
    chunks.push(array.slice(i, i + batchSize));
    i += batchSize;
  }

  return chunks;
}

export { getAllTuples, cartesianProduct, pushAll, splitIntoChunks };
