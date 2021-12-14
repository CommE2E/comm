// @flow

import * as React from 'react';
import { useSelector } from 'react-redux';

import { SQLiteContext } from '../data/sqlite-context';

function usePersistedStateLoaded(): boolean {
  const rehydrateConcluded = useSelector(state => !!state._persist?.rehydrated);
  const localDatabaseContext = React.useContext(SQLiteContext);

  return rehydrateConcluded && !!localDatabaseContext?.threadStoreLoaded;
}

export { usePersistedStateLoaded };
