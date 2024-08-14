// @flow

import { useNavigation } from '@react-navigation/core';
import invariant from 'invariant';
import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';

import {
  firstNUXTipKey,
  NUXTipsContext,
  getNUXTipParams,
} from './nux-tips-context.react.js';
import type { NUXTipRouteNames } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useOnFirstLaunchEffect } from '../utils/hooks.js';

function NUXHandler(): React.Node {
  const nuxTipsContext = React.useContext(NUXTipsContext);
  invariant(nuxTipsContext, 'nuxTipsContext should be defined');
  const { tipsProps } = nuxTipsContext;

  const loggedIn = useSelector(isLoggedIn);

  if (!tipsProps || !loggedIn) {
    return null;
  }

  return <NUXHandlerInner />;
}

function NUXHandlerInner(): React.Node {
  const navigation = useNavigation();

  const effect = React.useCallback(() => {
    const { nextTip, tooltipLocation, nextRouteName } =
      getNUXTipParams(firstNUXTipKey);
    invariant(nextRouteName && nextTip, 'first nux tip should be defined');

    navigation.navigate<NUXTipRouteNames>({
      name: nextRouteName,
      params: {
        tipKey: nextTip,
        tooltipLocation,
      },
    });
  }, [navigation]);

  useOnFirstLaunchEffect('NUX_HANDLER', effect);
}

export { NUXHandler };
