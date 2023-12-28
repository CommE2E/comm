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

  const tooltipMarginStyle = React.useMemo(() => {
    if (position === tooltipPositions.RIGHT) {
      return {
        marginLeft: tooltipMargin,
      };
    }
    if (position === tooltipPositions.LEFT) {
      return {
        marginRight: tooltipMargin,
      };
    }
    if (position === tooltipPositions.BOTTOM) {
      return {
        marginTop: tooltipMargin,
      };
    }
    if (position === tooltipPositions.TOP) {
      return {
        marginBottom: tooltipMargin,
      };
    }
    return null;
  }, [position, tooltipMargin]);

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
