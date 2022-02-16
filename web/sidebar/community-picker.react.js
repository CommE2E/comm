// @flow

import invariant from 'invariant';
import * as React from 'react';

import Button from '../components/button.react';
import UserSettingsModal from '../modals/account/user-settings-modal.react.js';
import { ModalContext } from '../modals/modal-provider.react';
import SWMansionIcon from '../SWMansionIcon.react';
import css from './community-picker.css';

function CommunityPicker(): React.Node {
  const modalContext = React.useContext(ModalContext);
  invariant(modalContext, 'ModalContext not found');

  const setModalToUserSettings = React.useCallback(() => {
    modalContext.setModal(<UserSettingsModal />);
  }, [modalContext]);

  return (
    <div className={css.container}>
      <SWMansionIcon icon="inbox" size={28} />
      <div className={css.spacer} />
      <Button variant="round" onClick={setModalToUserSettings}>
        <SWMansionIcon icon="settings" size={16} />
      </Button>
    </div>
  );
}

export default CommunityPicker;
