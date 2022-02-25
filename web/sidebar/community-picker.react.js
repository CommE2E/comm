// @flow

import * as React from 'react';

import Button from '../components/button.react';
import UserSettingsModal from '../modals/account/user-settings-modal.react.js';
import { useModalContext } from '../modals/modal-provider.react';
import SWMansionIcon from '../SWMansionIcon.react';
import css from './community-picker.css';

function CommunityPicker(): React.Node {
  const { setModal } = useModalContext();

  const setModalToUserSettings = React.useCallback(() => {
    setModal(<UserSettingsModal />);
  }, [setModal]);

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
