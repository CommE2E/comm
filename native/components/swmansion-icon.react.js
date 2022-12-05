// @flow

import { createIconSetFromIcoMoon, type Icon } from '@expo/vector-icons';

import icoMoonConfig from 'lib/shared/swmansion-icon-config.json';

const SWMansionIcon: Icon<string> = createIconSetFromIcoMoon(
  icoMoonConfig,
  'SWMansionIcons',
  'SWMansionIcons.ttf',
);

export default SWMansionIcon;
