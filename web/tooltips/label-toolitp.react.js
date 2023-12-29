// @flow

import classNames from 'classnames';
import * as React from 'react';

import css from './label-tooltip.css';
import { labelTooltipStyle } from './tooltip-constants.js';
import { tooltipPositions, type TooltipPosition } from './tooltip-utils.js';

type Props = {
  +tooltipLabel: string,
  +position: TooltipPosition,
  +tooltipMargin: number,
};

function LabelTooltip(props: Props): React.Node {
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
      <div className={css.tooltipLabel} style={labelTooltipStyle}>
        {tooltipLabel}
      </div>
    </div>
  );
}

export default LabelTooltip;
