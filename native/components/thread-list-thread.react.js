// @flow

import type { ViewStyle, TextStyle } from '../types/styles';
import type { AppState } from '../redux/redux-setup';

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Text, ViewPropTypes } from 'react-native';

import { connect } from 'lib/utils/redux-utils';

import Button from './button.react';
import ColorSplotch from './color-splotch.react';
import {
  type Colors,
  colorsPropType,
  colorsSelector,
  styleSelector,
} from '../themes/colors';
import { SingleLine } from './single-line.react';

type Props = {|
  threadInfo: ThreadInfo,
  onSelect: (threadID: string) => void,
  style?: ViewStyle,
  textStyle?: TextStyle,
  // Redux state
  colors: Colors,
  styles: typeof styles,
|};
class ThreadListThread extends React.PureComponent<Props> {
  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    onSelect: PropTypes.func.isRequired,
    style: ViewPropTypes.style,
    textStyle: Text.propTypes.style,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };

  render() {
    const { modalIosHighlightUnderlay: underlayColor } = this.props.colors;
    return (
      <Button
        onPress={this.onSelect}
        iosFormat="highlight"
        iosHighlightUnderlayColor={underlayColor}
        iosActiveOpacity={0.85}
        style={[this.props.styles.button, this.props.style]}
      >
        <ColorSplotch color={this.props.threadInfo.color} />
        <SingleLine style={[this.props.styles.text, this.props.textStyle]}>
          {this.props.threadInfo.uiName}
        </SingleLine>
      </Button>
    );
  }

  onSelect = () => {
    this.props.onSelect(this.props.threadInfo.id);
  };
}

const styles = {
  button: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingLeft: 13,
  },
  text: {
    color: 'modalForegroundLabel',
    fontSize: 16,
    paddingLeft: 9,
    paddingRight: 12,
    paddingVertical: 6,
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  colors: colorsSelector(state),
  styles: stylesSelector(state),
}))(ThreadListThread);
