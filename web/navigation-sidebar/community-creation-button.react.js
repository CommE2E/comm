// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';

import css from './community-creation-button.css';
import CommunityCreationModal from '../sidebar/community-creation/community-creation-modal.react.js';
import { useNavigationSidebarTooltip } from '../utils/tooltip-action-utils.js';

function CommunityCreationButton(): React.Node {
  const { pushModal } = useModalContext();

  const onPressCommunityCreationButton = React.useCallback(
    () => pushModal(<CommunityCreationModal />),
    [pushModal],
  );

  const { onMouseEnter, onMouseLeave } = useNavigationSidebarTooltip({
    tooltipLabel: 'Create community',
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
