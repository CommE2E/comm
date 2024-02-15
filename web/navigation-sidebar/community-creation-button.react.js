// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/swmansion-icon.react.js';

import css from './community-creation-button.css';
import { navigationSidebarLabelTooltipMargin } from './navigation-sidebar-constants.js';
import CommunityCreationModal from '../sidebar/community-creation/community-creation-modal.react.js';
import { useLabelTooltip } from '../tooltips/tooltip-action-utils.js';
import { tooltipPositions } from '../tooltips/tooltip-utils.js';

function CommunityCreationButton(): React.Node {
  const { pushModal } = useModalContext();

  const onPressCommunityCreationButton = React.useCallback(
    () => pushModal(<CommunityCreationModal />),
    [pushModal],
  );

  const { onMouseEnter, onMouseLeave } = useLabelTooltip({
    tooltipLabel: 'Create community',
    position: tooltipPositions.RIGHT,
    tooltipMargin: navigationSidebarLabelTooltipMargin,
  });

  return (
    <div
      className={css.container}
      onClick={onPressCommunityCreationButton}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <SWMansionIcon icon="plus-small" size={22} />
    </div>
  );
}

export default CommunityCreationButton;
