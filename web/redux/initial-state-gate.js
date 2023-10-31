// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/es/integration/react.js';
import type { Persistor } from 'redux-persist/es/types';

import { convertIDToNewSchema } from 'lib/utils/migration-utils.js';
import { infoFromURL } from 'lib/utils/url-utils.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import {
  setInitialReduxState,
  useGetInitialReduxState,
} from './action-types.js';
import { useSelector } from './redux-utils.js';
import Loading from '../loading.react.js';

type Props = {
  +persistor: Persistor,
  +children: React.Node,
};
function InitialReduxStateGate(props: Props): React.Node {
  const { children, persistor } = props;
  const callGetInitialReduxState = useGetInitialReduxState();
  const dispatch = useDispatch();

  const [initError, setInitError] = React.useState<?Error>(null);
  React.useEffect(() => {
    if (initError) {
      throw initError;
    }
  }, [initError]);

  const isRehydrated = useSelector(state => !!state._persist?.rehydrated);
  const prevIsRehydrated = React.useRef(false);
  React.useEffect(() => {
    if (!prevIsRehydrated.current && isRehydrated) {
      prevIsRehydrated.current = isRehydrated;
      (async () => {
        try {
          let urlInfo = infoFromURL(decodeURI(window.location.href));
          // Handle older links
          if (urlInfo.thread) {
            urlInfo = {
              ...urlInfo,
              thread: convertIDToNewSchema(urlInfo.thread, ashoatKeyserverID),
            };
          }
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
