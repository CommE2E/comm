// @flow

import * as React from 'react';

import { navigationSidebarTooltipStyle } from './navigation-sidebar-constants.js';
import css from './navigation-sidebar-tooltip.css';

type Props = {
  +tooltipLabel: string,
};

function NavigationSidebarTooltip(props: Props): React.Node {
  const { tooltipLabel } = props;

  return (
    <div className={css.container}>
      <div className={css.arrowLeft} />
      <div className={css.tooltipLabel} style={navigationSidebarTooltipStyle}>
        {tooltipLabel}
      </div>
    </div>
  );
}

export default NavigationSidebarTooltip;
