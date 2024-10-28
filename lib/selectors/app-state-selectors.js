// @flow

import { useSelector } from '../utils/redux-utils.js';

function usePersistedStateLoaded(): boolean {
  const rehydrateConcluded = useSelector(state => !!state._persist?.rehydrated);
  const initialStateLoaded = useSelector(state => state.initialStateLoaded);

  return rehydrateConcluded && initialStateLoaded;
}

export { usePersistedStateLoaded };
