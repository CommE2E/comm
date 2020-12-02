// @flow

import { globalLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import type { LoadingStatus } from 'lib/types/loading-types';
import { connect } from 'lib/utils/redux-utils';
import PropTypes from 'prop-types';
import React from 'react';
import { StatusBar, Platform } from 'react-native';

import type { AppState } from './redux/redux-setup';
import { type GlobalTheme, globalThemePropType } from './types/themes';

type Props = {|
  barStyle?: 'default' | 'light-content' | 'dark-content',
  animated?: boolean,
  // Redux state
  globalLoadingStatus: LoadingStatus,
  activeTheme: ?GlobalTheme,
|};
class ConnectedStatusBar extends React.PureComponent<Props> {
  static propTypes = {
    barStyle: PropTypes.oneOf(['default', 'light-content', 'dark-content']),
    animated: PropTypes.bool,
    globalLoadingStatus: PropTypes.string.isRequired,
    activeTheme: globalThemePropType,
  };

  render() {
    const {
      barStyle: inBarStyle,
      activeTheme,
      globalLoadingStatus,
      ...statusBarProps
    } = this.props;

    let barStyle = inBarStyle;
    if (!barStyle) {
      if (Platform.OS !== 'android' && this.props.activeTheme === 'light') {
        barStyle = 'dark-content';
      } else {
        barStyle = 'light-content';
      }
    }

    const fetchingSomething = this.props.globalLoadingStatus === 'loading';
    return (
      <StatusBar
        {...statusBarProps}
        barStyle={barStyle}
        networkActivityIndicatorVisible={fetchingSomething}
      />
    );
  }
}

export default connect((state: AppState) => ({
  globalLoadingStatus: globalLoadingStatusSelector(state),
  activeTheme: state.globalThemeInfo.activeTheme,
}))(ConnectedStatusBar);
