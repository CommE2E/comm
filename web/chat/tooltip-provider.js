// @flow

import invariant from 'invariant';
import * as React from 'react';

import type { TooltipPositionStyle } from './tooltip-utils';

export type RenderTooltipParams = {
  +newNode: React.Node,
  +tooltipPositionStyle: TooltipPositionStyle,
};

export type RenderTooltipResult = {
  +onMouseLeaveCallback: () => mixed,
  +clearTooltip: () => mixed,
};

type TooltipContextType = {
  +renderTooltip: (params: RenderTooltipParams) => RenderTooltipResult,
  +clearTooltip: () => mixed,
};

const TooltipContext: React.Context<TooltipContextType> = React.createContext<TooltipContextType>(
  {
    renderTooltip: () => ({
      onMouseLeaveCallback: () => {},
      clearTooltip: () => {},
    }),
    clearTooltip: () => {},
  },
);

type Props = {
  +children: React.Node,
};
function TooltipProvider(props: Props): React.Node {
  const { children } = props;
  // eslint-disable-next-line no-unused-vars
  const tooltipSymbol = React.useRef<?symbol>(null);
  // eslint-disable-next-line no-unused-vars
  const tooltipCancelTimer = React.useRef<?TimeoutID>(null);

  // eslint-disable-next-line no-unused-vars
  const [tooltipNode, setTooltipNode] = React.useState<React.Node>(null);
  const [
    // eslint-disable-next-line no-unused-vars
    tooltipPosition,
    // eslint-disable-next-line no-unused-vars
    setTooltipPosition,
  ] = React.useState<?TooltipPositionStyle>(null);

  const clearCurrentTooltip = React.useCallback(() => {}, []);

  const renderTooltip = React.useCallback(
    () => ({ onMouseLeaveCallback: () => {}, clearTooltip: () => {} }),
    [],
  );

  // eslint-disable-next-line no-unused-vars
  const onMouseEnterTooltip = React.useCallback(() => {}, []);

  // eslint-disable-next-line no-unused-vars
  const onMouseLeaveTooltip = React.useCallback(() => {}, []);

  const tooltip = React.useMemo(() => {}, []);

  const value = React.useMemo(
    () => ({
      renderTooltip,
      clearTooltip: clearCurrentTooltip,
    }),
    [renderTooltip, clearCurrentTooltip],
  );

  return (
    <TooltipContext.Provider value={value}>
      {children}
      {tooltip}
    </TooltipContext.Provider>
  );
}

function useTooltipContext(): TooltipContextType {
  const context = React.useContext(TooltipContext);
  invariant(context, 'TooltipContext not found');

  return context;
}

export { TooltipProvider, useTooltipContext };
