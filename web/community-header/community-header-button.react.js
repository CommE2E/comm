// @flow

import * as React from 'react';

import SWMansionIcon, {
  type Icon,
} from 'lib/components/swmansion-icon.react.js';

import css from './community-header-button.css';
import { useLabelTooltip } from '../tooltips/tooltip-action-utils.js';
import { tooltipPositions } from '../tooltips/tooltip-utils.js';

type Props = {
  +icon: Icon,
  +label: string,
  +onClick: () => mixed,
};

function CommunityHeaderButton(props: Props): React.Node {
  const { icon, label, onClick } = props;

  const { onMouseEnter, onMouseLeave } = useLabelTooltip({
    tooltipLabel: label,
    position: tooltipPositions.BOTTOM,
    tooltipMargin: 16,
  });

  return (
    <div
      className={css.container}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <SWMansionIcon icon={icon} size={20} className={css.addButton} />
    </div>
  );
}

export default CommunityHeaderButton;
