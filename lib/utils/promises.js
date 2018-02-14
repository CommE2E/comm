// @flow

type Promisable<T> = Promise<T> | T;
type SpinPromise = <V>(promise: Promisable<V>) => V;

async function promiseAll<T: {[key: string]: Promisable<*>}>(
  input: T,
): Promise<$ObjMap<T, SpinPromise>> {
  const promises = [];
  const keys = Object.keys(input);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const promise = input[key];
    promises.push(promise);
  }
  const results = await Promise.all(promises);
  const byName = {};
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    byName[key] = results[i];
  }
  return byName;
}

export {
  promiseAll,
};
