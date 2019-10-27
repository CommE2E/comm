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

import { MessageListRouteName } from '../../navigation/route-names';
import Button from '../../components/button.react';
import ColorSplotch from '../../components/color-splotch.react';
import ThreadVisibility from '../../components/thread-visibility.react';
import { colorsSelector, styleSelector } from '../../themes/colors';

type Props = {|
  threadInfo: ThreadInfo,
  navigate: Navigate,
  lastListItem: bool,
  // Redux state
  colors: Colors,
  styles: Styles,
|};
class ThreadSettingsChildThread extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    navigate: PropTypes.func.isRequired,
    lastListItem: PropTypes.bool.isRequired,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };

  render() {
    const lastButtonStyle = this.props.lastListItem
      ? this.props.styles.lastButton
      : null;
    return (
      <View style={this.props.styles.container}>
        <Button
          onPress={this.onPress}
          style={[ this.props.styles.button, lastButtonStyle ]}
        >
          <View style={this.props.styles.leftSide}>
            <ColorSplotch color={this.props.threadInfo.color} />
            <Text style={this.props.styles.text} numberOfLines={1}>
              {this.props.threadInfo.uiName}
            </Text>
          </View>
          <ThreadVisibility
            threadType={this.props.threadInfo.type}
            color={this.props.colors.panelForegroundSecondaryLabel}
            includeLabel={false}
          />
        </Button>
      </View>
    );
  }

  onPress = () => {
    const { threadInfo, navigate } = this.props;
    navigate({
      routeName: MessageListRouteName,
      params: { threadInfo },
      key: `${MessageListRouteName}${threadInfo.id}`,
    });
  }

}

const styles = {
  container: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: 'panelForeground',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'panelForegroundBorder',
  },
  leftSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    color: 'link',
    paddingLeft: 8,
  },
  lastButton: {
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  colors: colorsSelector(state),
  styles: stylesSelector(state),
}))(ThreadSettingsChildThread);
