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

export { getAllTuples, cartesianProduct };
