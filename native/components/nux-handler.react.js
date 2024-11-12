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

function NUXHandler(): React.Node {
  const nuxTipsContext = React.useContext(NUXTipsContext);
  invariant(nuxTipsContext, 'nuxTipsContext should be defined');
  const { tipsProps } = nuxTipsContext;

  const loggedIn = useSelector(isLoggedIn);

  const orderedTips = React.useMemo(
    () => [nuxTip.INTRO, nuxTip.COMMUNITY_DRAWER, nuxTip.HOME, nuxTip.MUTED],
    [],
  );

  if (!tipsProps || !loggedIn) {
    return null;
  }

  return <NUXHandlerInner orderedTips={orderedTips} />;
}

function NUXHandlerInner({
  orderedTips,
}: {
  +orderedTips: $ReadOnlyArray<NUXTip>,
}): React.Node {
  const navigation = useNavigation();

  const effect = React.useCallback(() => {
    navigation.navigate<'NUXTipOverlayBackdrop'>({
      name: 'NUXTipOverlayBackdrop',
      params: {
        orderedTips,
      },
    });
  }, [navigation, orderedTips]);

  useOnFirstLaunchEffect('NUX_HANDLER', effect);
}

export { NUXHandler };
