// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import Button from '../components/button.react';
import SWMansionIcon from '../SWMansionIcon.react';
import { updateNavInfoActionType } from '../types/nav-types.js';
import css from './community-picker.css';

function CommunityPicker(): React.Node {
  const dispatch = useDispatch();

  const openAccountSettings = React.useCallback(
    (event: SyntheticEvent<HTMLButtonElement>) => {
      event.preventDefault();
      dispatch({
        type: updateNavInfoActionType,
        payload: { tab: 'settings', settingsSection: 'account' },
      });
    },
    [dispatch],
  );

  return (
    <div className={css.container}>
      <SWMansionIcon icon="inbox" size={36} />
      <div className={css.spacer} />
      <Button variant="round" onClick={openAccountSettings}>
        <SWMansionIcon icon="settings" size={22} />
      </Button>
    </div>
  );
}

export default CommunityPicker;
