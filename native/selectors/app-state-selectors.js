// @flow

import { useSelector } from '../redux/redux-utils.js';

function usePersistedStateLoaded(): boolean {
  const rehydrateConcluded = useSelector(state => !!state._persist?.rehydrated);
  const storeLoaded = useSelector(state => state.storeLoaded);

  return rehydrateConcluded && storeLoaded;
}

export { usePersistedStateLoaded };
