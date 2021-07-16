// @flow

import { createIconSetFromIcoMoon, type Icon } from 'react-native-vector-icons';

import icoMoonConfig from './swmansion-icon-config.json';

const SWMansionIcon: Class<Icon<string>> = createIconSetFromIcoMoon(
  icoMoonConfig,
  'swmansion',
  'swmansion.ttf',
);

export default SWMansionIcon;
