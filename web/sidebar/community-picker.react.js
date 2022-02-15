// @flow

import invariant from 'invariant';
import * as React from 'react';

import Button from '../components/button.react';
import UserSettingsModal from '../modals/account/user-settings-modal.react.js';
import { ModalContext } from '../modals/modal/modal-context';
import SWMansionIcon from '../SWMansionIcon.react';
import css from './community-picker.css';

function CommunityPicker(): React.Node {
  const modalContext = React.useContext(ModalContext);
  invariant(modalContext, 'modalContext');

  const handleClick = modalContext.handleModal(<UserSettingsModal />);

  return (
    <div className={css.container}>
      <SWMansionIcon icon="inbox" size={28} />
      <div className={css.spacer} />
      <Button variant="round" onClick={handleClick}>
        <SWMansionIcon icon="settings" size={16} />
      </Button>
    </div>
  );
}

export default CommunityPicker;
