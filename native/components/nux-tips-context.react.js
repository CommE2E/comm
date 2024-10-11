// @flow

import * as React from 'react';
import { View } from 'react-native';

import { values } from 'lib/utils/objects.js';

import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import type { NUXTipRouteNames } from '../navigation/route-names.js';
import {
  CommunityDrawerTipRouteName,
  MutedTabTipRouteName,
  HomeTabTipRouteName,
  IntroTipRouteName,
} from '../navigation/route-names.js';

const nuxTip = Object.freeze({
  INTRO: 'intro',
  COMMUNITY_DRAWER: 'community_drawer',
  HOME: 'home',
  MUTED: 'muted',
});

export type NUXTip = $Values<typeof nuxTip>;

type NUXTipParams = {
  +nextTip: ?NUXTip,
  +tooltipLocation: 'below' | 'above' | 'absolute',
  +routeName: NUXTipRouteNames,
  +exitingCallback?: <Route: NUXTipRouteNames>(
    navigation: AppNavigationProp<Route>,
  ) => void,
};

const firstNUXTipKey = nuxTip.INTRO;

const nuxTipParams: { +[NUXTip]: NUXTipParams } = {
  [nuxTip.INTRO]: {
    nextTip: nuxTip.COMMUNITY_DRAWER,
    tooltipLocation: 'absolute',
    routeName: IntroTipRouteName,
  },
  [nuxTip.COMMUNITY_DRAWER]: {
    nextTip: nuxTip.HOME,
    tooltipLocation: 'below',
    routeName: CommunityDrawerTipRouteName,
  },
  [nuxTip.HOME]: {
    nextTip: nuxTip.MUTED,
    tooltipLocation: 'below',
    routeName: HomeTabTipRouteName,
  },
  [nuxTip.MUTED]: {
    nextTip: undefined,
    routeName: MutedTabTipRouteName,
    tooltipLocation: 'below',
    exitingCallback: navigation => navigation.goBack(),
  },
};

function getNUXTipParams(currentTipKey: NUXTip): NUXTipParams {
  return nuxTipParams[currentTipKey];
}

type TipProps = React.ElementRef<typeof View>;

export type NUXTipsContextType = {
  +registerTipButton: (type: NUXTip, tipProps: ?TipProps) => void,
  +tipsProps: ?{ +[type: NUXTip]: TipProps },
};

const NUXTipsContext: React.Context<?NUXTipsContextType> =
  React.createContext<?NUXTipsContextType>();

type Props = {
  +children: React.Node,
};

function NUXTipsContextProvider(props: Props): React.Node {
  const { children } = props;

  const [tipsPropsState, setTipsPropsState] = React.useState<{
    +[tip: NUXTip]: ?TipProps,
  }>(() => ({}));

  const registerTipButton = React.useCallback(
    (type: NUXTip, tipProps: ?TipProps) => {
      setTipsPropsState(currenttipsPropsState => {
        const newtipsPropsState = { ...currenttipsPropsState };
        newtipsPropsState[type] = tipProps;
        return newtipsPropsState;
      });
    },
    [],
  );

  const tipsProps = React.useMemo(() => {
    const result: { [tip: NUXTip]: TipProps } = {};
    for (const type of values(nuxTip)) {
      if (nuxTipParams[type].tooltipLocation === 'absolute') {
        continue;
      }
      if (!tipsPropsState[type]) {
        return null;
      }
      result[type] = tipsPropsState[type];
    }

    return result;
  }, [tipsPropsState]);

  const value = React.useMemo(
    () => ({
      registerTipButton,
      tipsProps,
    }),
    [tipsProps, registerTipButton],
  );

  return (
    <NUXTipsContext.Provider value={value}>{children}</NUXTipsContext.Provider>
  );
}

export {
  NUXTipsContext,
  NUXTipsContextProvider,
  nuxTip,
  getNUXTipParams,
  firstNUXTipKey,
};
