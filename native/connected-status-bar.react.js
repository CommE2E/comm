// @flow

import type { AppState } from './redux/redux-setup';
import type { LoadingStatus } from 'lib/types/loading-types';
import { type GlobalTheme, globalThemePropType } from './types/themes';

import React from 'react';
import { StatusBar, Platform } from 'react-native';
import PropTypes from 'prop-types';

import { globalLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { connect } from 'lib/utils/redux-utils';

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
    const fetchingSomething = this.props.globalLoadingStatus === 'loading';
    if (!barStyle && this.props.activeTheme === 'light') {
      barStyle = Platform.OS === 'android' ? 'light-content' : 'dark-content';
    } else if (!barStyle && this.props.activeTheme === 'dark') {
      barStyle = 'light-content';
    }

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
