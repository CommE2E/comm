// @flow

type Promisable<T> = Promise<T> | T;

async function promiseAll<T: { +[key: string]: Promisable<mixed> }>(
  input: T,
): Promise<$ObjMap<T, typeof $await>> {
  const promises = [];
  const keys = Object.keys(input);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const promise = input[key];
    promises.push(promise);
  }
  const results = await Promise.all(promises);
  const byName: { [string]: mixed } = {};
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    byName[key] = results[i];
  }
  return byName;
}

async function promiseFilter<T>(
  input: $ReadOnlyArray<T>,
  filterFunc: (value: T) => Promise<boolean>,
): Promise<T[]> {
  const filterResults = await Promise.all(input.map(filterFunc));
  return input.filter((value, index) => filterResults[index]);
}

export { promiseAll, promiseFilter };
