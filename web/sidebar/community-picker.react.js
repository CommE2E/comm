// @flow

import * as React from 'react';

import Button from '../components/button.react';
import UserSettingsModal from '../modals/account/user-settings-modal.react.js';
import SWMansionIcon from '../SWMansionIcon.react';
import css from './community-picker.css';

type Props = { +setModal: (modal: ?React.Node) => void };

function CommunityPicker(props: Props): React.Node {
  const { setModal } = props;

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
