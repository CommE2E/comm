// @flow

import classNames from 'classnames';
import * as React from 'react';

import { navigationSidebarTooltipStyle } from './navigation-sidebar-constants.js';
import css from './navigation-sidebar-tooltip.css';
import {
  tooltipPositions,
  type TooltipPosition,
} from '../utils/tooltip-utils.js';

type Props = {
  +tooltipLabel: string,
  +position: TooltipPosition,
  +tooltipMargin: number,
};

function NavigationSidebarTooltip(props: Props): React.Node {
  const { tooltipLabel, position, tooltipMargin } = props;

  const tooltipMarginStyle = React.useMemo(
    () => ({
      marginLeft: position === tooltipPositions.RIGHT ? tooltipMargin : 0,
      marginRight: position === tooltipPositions.LEFT ? tooltipMargin : 0,
      marginTop: position === tooltipPositions.BOTTOM ? tooltipMargin : 0,
      marginBottom: position === tooltipPositions.TOP ? tooltipMargin : 0,
    }),
    [position, tooltipMargin],
  );

  const arrowClassName = classNames(css.arrow, {
    [css.arrowLeft]: position === tooltipPositions.RIGHT,
    [css.arrowRight]: position === tooltipPositions.LEFT,
    [css.arrowTop]: position === tooltipPositions.BOTTOM,
    [css.arrowBottom]: position === tooltipPositions.TOP,
  });

  return (
    <div className={css.container} style={tooltipMarginStyle}>
      <div className={arrowClassName} />
      <div className={css.tooltipLabel} style={navigationSidebarTooltipStyle}>
        {tooltipLabel}
      </div>
    </div>
  );
}

export default NavigationSidebarTooltip;
