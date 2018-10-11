// @flow

import type { AppState } from '../../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';
import {
  type ThreadInfo,
  threadInfoPropType,
  type ChangeThreadSettingsResult,
  type UpdateThreadRequest,
} from 'lib/types/thread-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import { TouchableHighlight, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import { connect } from 'lib/utils/redux-utils';
import {
  changeThreadSettingsActionTypes,
  changeThreadSettings,
} from 'lib/actions/thread-actions';

import { createModal } from '../../components/modal.react';
import { AddUsersModalRouteName } from '../../navigation/route-names';
import ColorPicker from '../../components/color-picker.react';

const Modal = createModal(AddUsersModalRouteName);
type NavProp = NavigationScreenProp<{|
  ...NavigationLeafRoute,
  params: {|
    color: string,
    threadInfo: ThreadInfo,
    setColor: (color: string) => void,
  |},
|}>;

type Props = {|
  navigation: NavProp,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  changeThreadSettings: (
    request: UpdateThreadRequest,
  ) => Promise<ChangeThreadSettingsResult>,
|};
class ColorPickerModal extends React.PureComponent<Props> {

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          color: PropTypes.string.isRequired,
          threadInfo: threadInfoPropType.isRequired,
          setColor: PropTypes.func.isRequired,
        }).isRequired,
      }).isRequired,
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    changeThreadSettings: PropTypes.func.isRequired,
  };

  render() {
    const { color, threadInfo } = this.props.navigation.state.params;
    return (
      <Modal
        navigation={this.props.navigation}
        modalStyle={styles.colorPickerContainer}
      >
        <ColorPicker
          defaultColor={color}
          oldColor={threadInfo.color}
          onColorSelected={this.onColorSelected}
          style={styles.colorPicker}
        />
        <TouchableHighlight
          onPress={this.close}
          style={styles.closeButton}
          underlayColor="#CCCCCCDD"
        >
          <Icon
            name="close"
            size={16}
            color="#AAAAAA"
            style={styles.closeButtonIcon}
          />
        </TouchableHighlight>
      </Modal>
    );
  }

  close = () => {
    this.props.navigation.goBack();
  }

  onColorSelected = (color: string) => {
    const colorEditValue = color.substr(1);
    this.props.navigation.state.params.setColor(colorEditValue);
    this.close();
    this.props.dispatchActionPromise(
      changeThreadSettingsActionTypes,
      this.editColor(colorEditValue),
      { customKeyName: `${changeThreadSettingsActionTypes.started}:color` },
    );
  }

  async editColor(newColor: string) {
    const threadID = this.props.navigation.state.params.threadInfo.id;
    try {
      return await this.props.changeThreadSettings({
        threadID,
        changes: { color: newColor },
      });
    } catch (e) {
      Alert.alert(
        "Unknown error",
        "Uhh... try again?",
        [
          { text: 'OK', onPress: this.onErrorAcknowledged },
        ],
        { cancelable: false },
      );
      throw e;
    }
  }

  onErrorAcknowledged = () => {
    const { threadInfo, setColor } = this.props.navigation.state.params;
    setColor(threadInfo.color);
  }

}

const styles = StyleSheet.create({
  colorPickerContainer: {
    flex: 0,
    height: 350,
    backgroundColor: '#EEEEEE',
    marginVertical: 20,
    marginHorizontal: 15,
    borderRadius: 5,
  },
  colorPicker: {
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
    position: 'absolute',
  },
  closeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 3,
  },
  closeButtonIcon: {
    position: 'absolute',
    left: 3,
  },
});

export default connect(
  null,
  { changeThreadSettings },
)(ColorPickerModal);
