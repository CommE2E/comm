// @flow

import * as React from 'react';

import { useDispatch } from 'lib/utils/redux-utils.js';

import UserSettingsListItem from './user-settings-list-item.react.js';
import css from './user-settings-list.css';
import PanelHeader from '../components/panel-header.react.js';
import Panel, { type PanelData } from '../components/panel.react.js';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

function UserSettingsList(): React.Node {
  const dispatch = useDispatch();

  const staffCanSee = useStaffCanSee();

  const onClickAccountSettings = React.useCallback(() => {
    dispatch({
      type: updateNavInfoActionType,
      payload: { tab: 'settings', settingsSection: 'account' },
    });
  }, [dispatch]);

  const onClickFriendList = React.useCallback(() => {
    dispatch({
      type: updateNavInfoActionType,
      payload: { tab: 'settings', settingsSection: 'friend-list' },
    });
  }, [dispatch]);

  const onClickBlockList = React.useCallback(() => {
    dispatch({
      type: updateNavInfoActionType,
      payload: { tab: 'settings', settingsSection: 'block-list' },
    });
  }, [dispatch]);

  const onClickKeyservers = React.useCallback(() => {
    dispatch({
      type: updateNavInfoActionType,
      payload: { tab: 'settings', settingsSection: 'keyservers' },
    });
  }, [dispatch]);

  const onClickBuildInfo = React.useCallback(() => {
    dispatch({
      type: updateNavInfoActionType,
      payload: { tab: 'settings', settingsSection: 'build-info' },
    });
  }, [dispatch]);

  const keyserverSettingsListItem = React.useMemo(() => {
    if (!staffCanSee) {
      return null;
    }

    return (
      <UserSettingsListItem
        id="keyservers"
        name="Keyservers"
        onClick={onClickKeyservers}
      />
    );
  }, [onClickKeyservers, staffCanSee]);

  const userSettingsListBody = React.useMemo(
    () => (
      <div className={css.userSettingsList}>
        <UserSettingsListItem
          id="account"
          name="My account"
          onClick={onClickAccountSettings}
        />
        <UserSettingsListItem
          id="friend-list"
          name="Friend list"
          onClick={onClickFriendList}
        />
        <UserSettingsListItem
          id="block-list"
          name="Block list"
          onClick={onClickBlockList}
        />
        {keyserverSettingsListItem}
        <UserSettingsListItem
          id="build-info"
          name="Build info"
          onClick={onClickBuildInfo}
        />
      </div>
    ),
    [
      keyserverSettingsListItem,
      onClickAccountSettings,
      onClickBlockList,
      onClickBuildInfo,
      onClickFriendList,
    ],
  );

  const panelData: $ReadOnlyArray<PanelData> = React.useMemo(
    () => [
      {
        header: <PanelHeader headerLabel="Settings" />,
        body: userSettingsListBody,
        classNameOveride: css.container,
      },
    ],
    [userSettingsListBody],
  );

  const userSettingsList = React.useMemo(
    () => <Panel panelItems={panelData} />,
    [panelData],
  );

  return userSettingsList;
}

export default UserSettingsList;
