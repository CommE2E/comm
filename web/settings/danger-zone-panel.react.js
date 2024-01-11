// @flow

import * as React from 'react';

import css from './danger-zone.css';
import DangerZone from './danger-zone.react.js';
import PanelHeader from '../components/panel-header.react.js';
import Panel, { type PanelData } from '../components/panel.react.js';

const panelData: $ReadOnlyArray<PanelData> = [
  {
    header: <PanelHeader headerLabel="Danger zone" />,
    body: <DangerZone />,
    classNameOveride: css.container,
  },
];

function DangerZonePanel(): React.Node {
  return <Panel panelItems={panelData} />;
}

export default DangerZonePanel;
