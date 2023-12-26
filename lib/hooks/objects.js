// @flow

import * as React from 'react';

type CacheEntry<I, O> = {
  +inVal: I,
  +outVal: O,
  +derivationSelector: I => O,
};

function useDerivedObject<I, O>(
  object: { +[string]: I },
  createDerivationSelector: () => I => O,
): { +[string]: O } {
  const cacheRef = React.useRef<Map<string, CacheEntry<I, O>>>(new Map());
  const prevCreateDerivationSelector = React.useRef<() => I => O>(
    createDerivationSelector,
  );
  const prevResultRef = React.useRef<?{ +[string]: O }>();

  return React.useMemo(() => {
    if (prevCreateDerivationSelector.current !== createDerivationSelector) {
      cacheRef.current = new Map();
      prevCreateDerivationSelector.current = createDerivationSelector;
    }

    const cache = cacheRef.current;

    const newCache = new Map<string, CacheEntry<I, O>>();
    let changeOccurred = Object.keys(object).length !== cache.size;

    const result: { [string]: O } = {};
    for (const key in object) {
      const inVal = object[key];

      const cacheEntry = cache.get(key);
      if (!cacheEntry) {
        changeOccurred = true;
        const derivationSelector = createDerivationSelector();
        const outVal = derivationSelector(inVal);
        newCache.set(key, { inVal, outVal, derivationSelector });
        result[key] = outVal;
        continue;
      }

      if (inVal === cacheEntry.inVal) {
        newCache.set(key, cacheEntry);
        result[key] = cacheEntry.outVal;
        continue;
      }

      const { derivationSelector } = cacheEntry;
      const outVal = derivationSelector(inVal);
      if (outVal !== cacheEntry.outVal) {
        changeOccurred = true;
      }
      newCache.set(key, { inVal, outVal, derivationSelector });
      result[key] = outVal;
    }
    cacheRef.current = newCache;

    if (!changeOccurred && prevResultRef.current) {
      return prevResultRef.current;
    }
    prevResultRef.current = result;
    return result;
  }, [object, createDerivationSelector]);
}

export { useDerivedObject };
