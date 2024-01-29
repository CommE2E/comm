// @flow

import * as React from 'react';

import css from './account-settings.css';
import AccountSettings from './account-settings.react.js';
import PanelHeader from '../components/panel-header.react.js';
import Panel, { type PanelData } from '../components/panel.react.js';

const panelData: $ReadOnlyArray<PanelData> = [
  {
    header: <PanelHeader headerLabel="My account" />,
    body: <AccountSettings />,
    classNameOveride: css.panelContainer,
  },
];

function AccountSettingsPanel(): React.Node {
  return <Panel panelItems={panelData} />;
}

export default AccountSettingsPanel;
