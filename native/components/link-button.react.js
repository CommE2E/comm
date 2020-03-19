// @flow

import type { ViewStyle, Styles } from '../types/styles';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { Text, ViewPropTypes } from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import Button from './button.react';
import { styleSelector } from '../themes/colors';

type Props = {
  text: string,
  onPress: () => void,
  disabled?: boolean,
  style?: ViewStyle,
  // Redux state
  styles: Styles,
};
class LinkButton extends React.PureComponent<Props> {
  static propTypes = {
    text: PropTypes.string.isRequired,
    onPress: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    style: ViewPropTypes.style,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };

  render() {
    const disabledStyle = this.props.disabled
      ? this.props.styles.disabled
      : null;
    return (
      <Button
        onPress={this.props.onPress}
        androidBorderlessRipple={true}
        iosActiveOpacity={0.85}
        disabled={!!this.props.disabled}
        style={this.props.style}
      >
        <Text style={[this.props.styles.text, disabledStyle]}>
          {this.props.text}
        </Text>
      </Button>
    );
  }
}

const styles = {
  text: {
    fontSize: 17,
    paddingHorizontal: 10,
    color: 'link',
  },
  disabled: {
    color: 'modalBackgroundSecondaryLabel',
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(LinkButton);
