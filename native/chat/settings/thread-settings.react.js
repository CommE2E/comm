// @flow

import type {
  NavigationScreenProp,
  NavigationRoute,
  NavigationAction,
} from 'react-navigation/src/TypeDefinition';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../../redux-setup';

import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import ThreadSettingsCategory from './thread-settings-category.react';
import ColorSplotch from '../../components/color-splotch.react';
import EditSettingButton from './edit-setting-button.react';

type NavProp = NavigationScreenProp<NavigationRoute, NavigationAction>
  & { state: { params: { threadInfo: ThreadInfo } } };

type Props = {
  navigation: NavProp,
};
type State = {
};
class InnerThreadSettings extends React.PureComponent {

  props: Props;
  state: State;
  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          threadInfo: threadInfoPropType.isRequired,
        }).isRequired,
      }).isRequired,
      goBack: PropTypes.func.isRequired,
    }).isRequired,
  };
  static navigationOptions = ({ navigation }) => ({
    title: navigation.state.params.threadInfo.name,
  });

  render() {
    const threadInfo = this.props.navigation.state.params.threadInfo;
    return (
      <ScrollView styles={styles.scrollView}>
        <ThreadSettingsCategory type="full" title="Basics">
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={[styles.currentValue, styles.currentValueText]}>
              {threadInfo.name}
            </Text>
            <EditSettingButton
              onPress={this.onPressEditName}
              canChangeSettings={threadInfo.canChangeSettings}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Color</Text>
            <View style={styles.currentValue}>
              <ColorSplotch color={threadInfo.color} />
            </View>
            <EditSettingButton
              onPress={this.onPressEditColor}
              canChangeSettings={threadInfo.canChangeSettings}
            />
          </View>
        </ThreadSettingsCategory>
      </ScrollView>
    );
  }

  onPressEditName = () => {
  }

  onPressEditColor = () => {
  }

}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  label: {
    fontSize: 16,
    width: 80,
    color: "#888888",
  },
  currentValue: {
    flex: 1,
    flexDirection: 'row',
  },
  currentValueText: {
    fontSize: 16,
    color: "#333333",
  },
});

const ThreadSettingsRouteName = 'ThreadSettings';
const ThreadSettings = connect(
  (state: AppState, ownProps: { navigation: NavProp }) => ({
  }),
)(InnerThreadSettings);

export {
  ThreadSettings,
  ThreadSettingsRouteName,
};
