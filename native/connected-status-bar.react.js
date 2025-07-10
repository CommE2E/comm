// @flow

import * as React from 'react';
import { Platform } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';

import { globalLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';

import { useSelector } from './redux/redux-utils.js';

type Props = {
  +barStyle?: 'default' | 'light-content' | 'dark-content',
  +animated?: boolean,
  +hidden?: boolean,
};
export default function ConnectedStatusBar(props: Props): React.Node {
  const globalLoadingStatus = useSelector(globalLoadingStatusSelector);
  const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);
  const { barStyle: inBarStyle, ...statusBarProps } = props;

  let barStyle = inBarStyle;
  if (!barStyle) {
    if (Platform.OS !== 'android' && activeTheme === 'light') {
      barStyle = 'dark-content';
    } else {
      barStyle = 'light-content';
    }
  }

  const fetchingSomething = globalLoadingStatus === 'loading';
  return (
    <SystemBars
      {...statusBarProps}
      barStyle={barStyle}
      networkActivityIndicatorVisible={fetchingSomething}
    />
  );
}
