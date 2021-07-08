// @flow

import { createIconSetFromIcoMoon } from 'react-native-vector-icons';

import icoMoonConfig from './swmansion-icon-config.json';

const SWMansionIcon = createIconSetFromIcoMoon(
  icoMoonConfig,
  'swmansion',
  'swmansion.ttf',
);

export default SWMansionIcon;
