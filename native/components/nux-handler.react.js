// @flow

import { useNavigation } from '@react-navigation/core';
import invariant from 'invariant';
import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';

import {
  type NUXTip,
  NUXTipsContext,
  nuxTip,
} from './nux-tips-context.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useOnFirstLaunchEffect } from '../utils/hooks.js';

const orderedTips: $ReadOnlyArray<NUXTip> = [
  nuxTip.INTRO,
  nuxTip.COMMUNITY_DRAWER,
  nuxTip.HOME,
  nuxTip.MUTED,
];

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
    navigation.navigate<'NUXTipOverlayBackdrop'>({
      name: 'NUXTipOverlayBackdrop',
      params: {
        orderedTips,
      },
    });
  }, [navigation]);

  useOnFirstLaunchEffect('NUX_HANDLER', effect);
}

export { NUXHandler };
