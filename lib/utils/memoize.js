// @flow

import _memoize from 'lodash/memoize.js';

export default function memoize2<T, U, V>(
  f: (t: T, u: U) => V,
): (t: T, u: U) => V {
  const memoized = _memoize<[T], (U) => V>((t: T) =>
    _memoize<[U], V>((u: U) => f(t, u)),
  );
  return (t: T, u: U) => memoized(t)(u);
}
