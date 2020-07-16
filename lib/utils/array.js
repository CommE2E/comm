// @flow

function getAllTuples<T>([head, ...tail]: Array<T>): Array<[T, T]> {
  if (tail.length > 0) {
    return [...tail.map(tailValue => [head, tailValue]), ...getAllTuples(tail)];
  }
  return [];
}

function cartesianProduct<R, C>(
  rows: Array<R>,
  columns: Array<C>,
): Array<[R, C]> {
  return rows.reduce((acc, rowValue) => {
    acc.push(...columns.map(columnValue => [rowValue, columnValue]));
    return acc;
  }, []);
}

export { getAllTuples, cartesianProduct };
