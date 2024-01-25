// @flow

import * as React from 'react';

import css from './build-info.css';
import BuildInfo from './build-info.react.js';
import PanelHeader from '../components/panel-header.react.js';
import Panel, { type PanelData } from '../components/panel.react.js';

const panelData: $ReadOnlyArray<PanelData> = [
  {
    header: <PanelHeader headerLabel="Build info" />,
    body: <BuildInfo />,
    classNameOveride: css.container,
  },
];

function BuildInfoPanel(): React.Node {
  return <Panel panelItems={panelData} />;
}

export default BuildInfoPanel;
