// @flow

import { createIconSetFromIcoMoon, type Icon } from '@expo/vector-icons';

import icoMoonConfig from 'lib/shared/comm-icon-config.json';

const CommIcon: Icon<string> = createIconSetFromIcoMoon(
  icoMoonConfig,
  'CommIcons',
  'CommIcons.ttf',
);

export default CommIcon;
