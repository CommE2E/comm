// @flow

import * as React from 'react';

const tip = Object.freeze({
  MUTED: 'muted',
  COMMUNITY_DRAWER: 'community_drawer',
});

type Tip = $Values<typeof tip>;

type TipProps = {
  +x?: ?number,
  +y?: ?number,
  +width?: ?number,
  +height?: ?number,
  +pageX?: ?number,
  +pageY?: ?number,
};

type RequiredTipProps = $ObjMap<TipProps, <V>(V) => V>;

export type NUXTipsContextType = {
  +registerTipButton: (type: Tip, tipProps: RequiredTipProps) => void,
  +getTipsProps: () => ?{ [type: Tip]: TipProps },
};

const NUXTipsContext: React.Context<?NUXTipsContextType> =
  React.createContext<?NUXTipsContextType>();

type Props = {
  +children: React.Node,
};

function NUXTipsContextProvider(props: Props): React.Node {
  const { children } = props;

  const tipsProps: { [tip: Tip]: TipProps } = React.useMemo(
    () => ({
      [tip.MUTED]: {},
      [tip.COMMUNITY_DRAWER]: {},
    }),
    [],
  );

  const registerTipButton = React.useCallback(
    (type: Tip, tipProps: RequiredTipProps) => {
      tipsProps[type] = {
        ...tipsProps[type],
        ...tipProps,
      };
    },
    [tipsProps],
  );

  const getTipsProps = React.useCallback(() => {
    for (const type in tipsProps) {
      // $FlowIssue
      if (!tipsProps[type].x) {
        return null;
      }
    }
    return tipsProps;
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

export { NUXTipsContext, NUXTipsContextProvider, tip };
