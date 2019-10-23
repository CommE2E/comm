// @flow

import type { AppState } from '../redux/redux-setup';
import type { Styles } from '../types/styles';
import { type GlobalTheme, globalThemePropType } from '../types/themes';

import * as React from 'react';
import { ActivityIndicator } from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import { colors, styleSelector } from '../themes/colors';

type Props = {|
  // Redux state
  activeTheme: ?GlobalTheme,
  styles: Styles,
|};
class ListLoadingIndicator extends React.PureComponent<Props> {

  static propTypes = {
    activeTheme: globalThemePropType,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };

  render() {
    const { listBackgroundLabel } = this.props.activeTheme === 'dark'
      ? colors.dark
      : colors.light;
    return (
      <ActivityIndicator
        color={listBackgroundLabel}
        size="large"
        style={this.props.styles.loadingIndicator}
      />
    );
  }

}

const styles = {
  loadingIndicator: {
    flex: 1,
    backgroundColor: 'listBackground',
    padding: 10,
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  activeTheme: state.globalThemeInfo.activeTheme,
  styles: stylesSelector(state),
}))(ListLoadingIndicator);
