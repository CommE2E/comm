// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { ChangeThreadSettingsResult } from 'lib/actions/thread-actions';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { AppState } from '../../redux-setup';

import React from 'react';
import {
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  View,
  Platform,
} from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import {
  changeThreadSettingsActionTypes,
  changeSingleThreadSetting,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import EditSettingButton from './edit-setting-button.react';
import ColorSplotch from '../../components/color-splotch.react';
import ColorPickerModal from '../color-picker-modal.react';

type Props = {|
  threadInfo: ThreadInfo,
  colorEditValue: string,
  setColorEditValue: (color: string) => void,
  showEditColorModal: bool,
  setEditColorModalVisibility: (visible: bool) => void,
  canChangeSettings: bool,
  // Redux state
  loadingStatus: LoadingStatus,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  changeSingleThreadSetting: (
    threadID: string,
    field: "name" | "description" | "color",
    value: string,
  ) => Promise<ChangeThreadSettingsResult>,
|};
class ThreadSettingsColor extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    colorEditValue: PropTypes.string.isRequired,
    setColorEditValue: PropTypes.func.isRequired,
    showEditColorModal: PropTypes.bool.isRequired,
    setEditColorModalVisibility: PropTypes.func.isRequired,
    canChangeSettings: PropTypes.bool.isRequired,
    loadingStatus: loadingStatusPropType.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    changeSingleThreadSetting: PropTypes.func.isRequired,
  };

  render() {
    let colorButton;
    if (this.props.loadingStatus !== "loading") {
      colorButton = (
        <EditSettingButton
          onPress={this.onPressEditColor}
          canChangeSettings={this.props.canChangeSettings}
          style={styles.colorLine}
        />
      );
    } else {
      colorButton = <ActivityIndicator size="small" key="activityIndicator" />;
    }

    return (
      <View style={styles.colorRow}>
        <Text style={[styles.label, styles.colorLine]}>Color</Text>
        <View style={styles.currentValue}>
          <ColorSplotch color={this.props.threadInfo.color} />
        </View>
        {colorButton}
        <ColorPickerModal
          isVisible={this.props.showEditColorModal}
          closeModal={this.closeColorPicker}
          color={this.props.colorEditValue}
          oldColor={this.props.threadInfo.color}
          onColorSelected={this.onColorSelected}
        />
      </View>
    );
  }

  onPressEditColor = () => {
    this.props.setEditColorModalVisibility(true);
  }

  closeColorPicker = () => {
    this.props.setEditColorModalVisibility(false);
  }

  onColorSelected = (color: string) => {
    const colorEditValue = color.substr(1);
    this.props.setColorEditValue(colorEditValue);
    this.props.dispatchActionPromise(
      changeThreadSettingsActionTypes,
      this.editColor(colorEditValue),
      { customKeyName: `${changeThreadSettingsActionTypes.started}:color` },
    );
  }

  async editColor(newColor: string) {
    try {
      return await this.props.changeSingleThreadSetting(
        this.props.threadInfo.id,
        "color",
        newColor,
      );
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
    this.props.setColorEditValue(this.props.threadInfo.color);
  }

}

const styles = StyleSheet.create({
  colorRow: {
    flexDirection: 'row',
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 24,
    backgroundColor: "white",
  },
  colorLine: {
    lineHeight: Platform.select({ android: 22, default: 25 }),
  },
  label: {
    fontSize: 16,
    width: 96,
    color: "#888888",
  },
  currentValue: {
    flex: 1,
    paddingLeft: 4,
  },
});

const loadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
  `${changeThreadSettingsActionTypes.started}:color`,
);

export default connect(
  (state: AppState) => ({
    loadingStatus: loadingStatusSelector(state),
    cookie: state.cookie,
  }),
  includeDispatchActionProps,
  bindServerCalls({ changeSingleThreadSetting }),
)(ThreadSettingsColor);
