// @flow

import { useNavigation } from '@react-navigation/core';
import invariant from 'invariant';
import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';

import { NUXTipsContext } from './nux-tips-context.react.js';
import type { NUXTipRouteNames } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';

function NUXHandler(): React.Node {
  const navigation = useNavigation();

  const nuxTipsContext = React.useContext(NUXTipsContext);
  invariant(nuxTipsContext, 'nuxTipsContext should be defined');
  const { getTipsProps } = nuxTipsContext;

  const loggedIn = useSelector(isLoggedIn);
  const prevLoggedIn = React.useRef(false);

  React.useEffect(() => {
    if (!getTipsProps() || !loggedIn || prevLoggedIn.current) {
      return;
    }
    prevLoggedIn.current = true;

    navigation.navigate<NUXTipRouteNames>({
      name: 'CommunityDrawerTip',
      params: {
        tipKey: 'community_drawer',
        tooltipLocation: 'below',
      },
    });
  }, [getTipsProps, navigation, loggedIn]);
}

export { NUXHandler };
