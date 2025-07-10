// @flow

import * as React from 'react';
import { SystemBars } from 'react-native-edge-to-edge';

import { globalLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';

import { useSelector } from './redux/redux-utils.js';

type Props = {
  +barStyle?: 'default' | 'light' | 'dark',
  +animated?: boolean,
  +hidden?: boolean,
};
export default function ConnectedStatusBar(props: Props): React.Node {
  const globalLoadingStatus = useSelector(globalLoadingStatusSelector);
  const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);
  const { barStyle: inBarStyle, ...statusBarProps } = props;

  let barStyle = inBarStyle;
  if (!barStyle) {
    if (activeTheme === 'light') {
      barStyle = 'dark';
    } else {
      barStyle = 'light';
    }
  }

  const fetchingSomething = globalLoadingStatus === 'loading';
  return (
    <SystemBars
      {...statusBarProps}
      style={barStyle}
      networkActivityIndicatorVisible={fetchingSomething}
    />
  );
}
