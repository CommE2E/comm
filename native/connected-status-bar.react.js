// @flow

import React from 'react';
import { StatusBar, Platform } from 'react-native';

import { globalLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import { useSelector } from './redux/redux-utils';

type Props = {|
  +barStyle?: 'default' | 'light-content' | 'dark-content',
  +animated?: boolean,
  +hidden?: boolean,
|};
export default function ConnectedStatusBar(props: Props) {
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
    <StatusBar
      {...statusBarProps}
      barStyle={barStyle}
      networkActivityIndicatorVisible={fetchingSomething}
    />
  );
}
