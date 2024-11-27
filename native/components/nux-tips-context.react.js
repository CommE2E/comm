// @flow

import * as React from 'react';
import type { MeasureOnSuccessCallback } from 'react-native/Libraries/Renderer/shims/ReactNativeTypes';

import { values } from 'lib/utils/objects.js';

import type { NUXTipRouteNames } from '../navigation/route-names.js';
import {
  CommunityDrawerTipRouteName,
  MutedTabTipRouteName,
  HomeTabTipRouteName,
  IntroTipRouteName,
  CommunityDirectoryTipRouteName,
} from '../navigation/route-names.js';

const nuxTip = Object.freeze({
  INTRO: 'intro',
  COMMUNITY_DRAWER: 'community_drawer',
  HOME: 'home',
  MUTED: 'muted',
  COMMUNITY_DIRECTORY: 'community_directory',
});

export type NUXTip = $Values<typeof nuxTip>;

type NUXTipParams = {
  +tooltipLocation: 'below' | 'above' | 'absolute',
  +routeName: NUXTipRouteNames,
};

const firstNUXTipKey = nuxTip.INTRO;

const nuxTipParams: { +[NUXTip]: NUXTipParams } = {
  [nuxTip.INTRO]: {
    tooltipLocation: 'absolute',
    routeName: IntroTipRouteName,
  },
  [nuxTip.COMMUNITY_DRAWER]: {
    tooltipLocation: 'below',
    routeName: CommunityDrawerTipRouteName,
  },
  [nuxTip.HOME]: {
    tooltipLocation: 'below',
    routeName: HomeTabTipRouteName,
  },
  [nuxTip.MUTED]: {
    routeName: MutedTabTipRouteName,
    tooltipLocation: 'below',
  },
  [nuxTip.COMMUNITY_DIRECTORY]: {
    tooltipLocation: 'below',
    routeName: CommunityDirectoryTipRouteName,
  },
};

function getNUXTipParams(currentTipKey: NUXTip): NUXTipParams {
  return nuxTipParams[currentTipKey];
}

type TipProps = (callback: MeasureOnSuccessCallback) => void;

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
