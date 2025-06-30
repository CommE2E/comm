// @flow

import * as React from 'react';

import { setNavStateActionType } from './action-types.js';
import { NavContext } from './navigation-context.js';
import type { MonitorActionState } from '../redux/dev-tools.react.js';
import { useSelector } from '../redux/redux-utils.js';

const NavFromReduxHandler: React.ComponentType<{}> = React.memo(
  function NavFromReduxHandler() {
    const navContext = React.useContext(NavContext);

    const navStateInRedux = useSelector(
      (state: MonitorActionState) => state.navState,
    );

    const dispatch = React.useMemo(() => {
      if (!navContext) {
        return null;
      }
      return navContext.dispatch;
    }, [navContext]);

    React.useEffect(() => {
      if (!dispatch) {
        return;
      }
      if (navStateInRedux) {
        dispatch({
          type: setNavStateActionType,
          payload: { state: navStateInRedux },
        });
      }
    }, [dispatch, navStateInRedux]);

    return null;
  },
);
NavFromReduxHandler.displayName = 'NavFromReduxHandler';

export default NavFromReduxHandler;
