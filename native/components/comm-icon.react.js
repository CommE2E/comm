// @flow

import { createIconSetFromIcoMoon, type Icon } from 'react-native-vector-icons';

import icoMoonConfig from 'lib/shared/comm-icon-config.json';

const CommIcon: Class<Icon<string>> = createIconSetFromIcoMoon(
  icoMoonConfig,
  'CommIcons',
  'CommIcons.ttf',
);

export default CommIcon;
