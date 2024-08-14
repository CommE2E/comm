// @flow

import * as React from 'react';

import { values } from 'lib/utils/objects.js';

import type { NUXTipRouteNames } from '../navigation/route-names.js';
import { MutedTabTipRouteName } from '../navigation/route-names.js';

const nuxTip = Object.freeze({
  COMMUNITY_DRAWER: 'community_drawer',
  MUTED: 'muted',
  HOME: 'home',
});

export type NUXTip = $Values<typeof nuxTip>;

type NUXTipCallbackParams = {
  +nextTip: ?NUXTip,
  +tooltipLocation: 'below' | 'above',
  +nextRouteName: ?NUXTipRouteNames,
};

const nuxTipCallbackParams: { [NUXTip]: NUXTipCallbackParams } = {
  [nuxTip.COMMUNITY_DRAWER]: {
    nextTip: nuxTip.MUTED,
    tooltipLocation: 'below',
    nextRouteName: MutedTabTipRouteName,
  },
  [nuxTip.MUTED]: {
    nextTip: undefined,
    nextRouteName: undefined,
    tooltipLocation: 'below',
  },
};

function getTipCallbackParams(currentTipKey: NUXTip): NUXTipCallbackParams {
  return nuxTipCallbackParams[currentTipKey];
}

type TipProps = {
  +x: number,
  +y: number,
  +width: number,
  +height: number,
  +pageX: number,
  +pageY: number,
};

export type NUXTipsContextType = {
  +registerTipButton: (type: NUXTip, tipProps: ?TipProps) => void,
  +getTipsProps: () => ?{ +[type: NUXTip]: TipProps },
};

const NUXTipsContext: React.Context<?NUXTipsContextType> =
  React.createContext<?NUXTipsContextType>();

type Props = {
  +children: React.Node,
};

function NUXTipsContextProvider(props: Props): React.Node {
  const { children } = props;

  const tipsProps = React.useMemo<{ [tip: NUXTip]: ?TipProps }>(() => ({}), []);

  const registerTipButton = React.useCallback(
    (type: NUXTip, tipProps: ?TipProps) => {
      tipsProps[type] = tipProps;
    },
    [tipsProps],
  );

  const getTipsProps = React.useCallback(() => {
    const result: { [tip: NUXTip]: TipProps } = {};
    for (const type of values(nuxTip)) {
      if (!tipsProps[type]) {
        return null;
      }
      result[type] = tipsProps[type];
    }

    return result;
  }, [tipsProps]);

  const value = React.useMemo(
    () => ({
      registerTipButton,
      getTipsProps,
    }),
    [getTipsProps, registerTipButton],
  );

  return (
    <NUXTipsContext.Provider value={value}>{children}</NUXTipsContext.Provider>
  );
}

export { NUXTipsContext, NUXTipsContextProvider, nuxTip, getTipCallbackParams };
