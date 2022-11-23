// @flow

import { useSelector } from 'react-redux';

function usePersistedStateLoaded(): boolean {
  const rehydrateConcluded = useSelector(state => !!state._persist?.rehydrated);
  const storeLoaded = useSelector(state => state.storeLoaded);

  return rehydrateConcluded && storeLoaded;
}

export { usePersistedStateLoaded };
