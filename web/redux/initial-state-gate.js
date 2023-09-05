// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/es/integration/react.js';
import type { Persistor } from 'redux-persist/es/types';

import { useServerCall } from 'lib/utils/action-utils.js';
import { infoFromURL } from 'lib/utils/url-utils.js';

import { getInitialReduxState, setInitialReduxState } from './action-types.js';
import { useSelector } from './redux-utils.js';
import Loading from '../loading.react.js';

type Props = {
  +persistor: Persistor,
  +children: React.Node,
};
function InitialReduxStateGate(props: Props): React.Node {
  const { children, persistor } = props;
  const callGetInitialReduxState = useServerCall(getInitialReduxState);
  const dispatch = useDispatch();

  const [initError, setInitError] = React.useState<?Error>(null);
  React.useEffect(() => {
    if (initError) {
      throw initError;
    }
  });

  const isRehydrated = useSelector(
    state => state._persist?.rehydrated ?? false,
  );
  const prevIsRehydrated = React.useRef(false);
  React.useEffect(() => {
    if (!prevIsRehydrated.current && isRehydrated) {
      prevIsRehydrated.current = isRehydrated;
      (async () => {
        try {
          const urlInfo = infoFromURL(decodeURI(window.location.href));
          const payload = await callGetInitialReduxState(urlInfo);
          dispatch({ type: setInitialReduxState, payload });
        } catch (err) {
          setInitError(err);
        }
      })();
    }
  }, [callGetInitialReduxState, dispatch, isRehydrated]);

  const initialStateLoaded = useSelector(state => state.initialStateLoaded);

  const childFunction = React.useCallback(
    // This argument is passed from `PersistGate`. It means that the state is
    // rehydrated and we can start fetching the initial info.
    bootstrapped => {
      if (bootstrapped && initialStateLoaded) {
        return children;
      } else {
        return <Loading />;
      }
    },
    [children, initialStateLoaded],
  );

  return <PersistGate persistor={persistor}>{childFunction}</PersistGate>;
}

export default InitialReduxStateGate;
