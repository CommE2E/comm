// @flow

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { Navigate } from '../../navigation/route-names';
import type { AppState } from '../../redux/redux-setup';
import { type Colors, colorsPropType } from '../../themes/colors';
import type { Styles } from '../../types/styles';

import * as React from 'react';
import { Text, View, Platform } from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import Button from '../../components/button.react';
import { DeleteThreadRouteName } from '../../navigation/route-names';
import { colorsSelector, styleSelector } from '../../themes/colors';

type Props = {|
  threadInfo: ThreadInfo,
  navigate: Navigate,
  canLeaveThread: bool,
  // Redux state
  colors: Colors,
  styles: Styles,
|};
class ThreadSettingsDeleteThread extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    navigate: PropTypes.func.isRequired,
    canLeaveThread: PropTypes.bool.isRequired,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };

  render() {
    const borderStyle = this.props.canLeaveThread
      ? this.props.styles.border
      : null;
    const { panelIosHighlightUnderlay } = this.props.colors;
    return (
      <View style={this.props.styles.container}>
        <Button
          onPress={this.onPress}
          style={[ this.props.styles.button, borderStyle ]}
          iosFormat="highlight"
          iosHighlightUnderlayColor={panelIosHighlightUnderlay}
        >
          <Text style={this.props.styles.text}>Delete thread...</Text>
        </Button>
      </View>
    );
  }

  onPress = () => {
    const threadInfo = this.props.threadInfo;
    this.props.navigate({
      routeName: DeleteThreadRouteName,
      params: { threadInfo },
      key: `${DeleteThreadRouteName}${threadInfo.id}`,
    });
  }

}

const styles = {
  container: {
    backgroundColor: 'panelForeground',
    paddingHorizontal: 12,
  },
  button: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 14 : 12,
  },
  text: {
    fontSize: 16,
    color: 'redText',
    flex: 1,
  },
  border: {
    borderTopWidth: 1,
    borderColor: 'panelForegroundBorder',
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  colors: colorsSelector(state),
  styles: stylesSelector(state),
}))(ThreadSettingsDeleteThread);
