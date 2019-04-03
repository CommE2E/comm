// @flow

import {
  type ThreadInfo,
  threadInfoPropType,
  type ChangeThreadSettingsResult,
  type UpdateThreadRequest,
} from 'lib/types/thread-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { AppState } from '../../redux/redux-setup';

import * as React from 'react';
import {
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  View,
} from 'react-native';
import PropTypes from 'prop-types';
import invariant from 'invariant';

import { connect } from 'lib/utils/redux-utils';
import {
  changeThreadSettingsActionTypes,
  changeThreadSettings,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import EditSettingButton from '../../components/edit-setting-button.react';
import SaveSettingButton from './save-setting-button.react';

type Props = {|
  threadInfo: ThreadInfo,
  nameEditValue: ?string,
  setNameEditValue: (value: ?string, callback?: () => void) => void,
  nameTextHeight: ?number,
  setNameTextHeight: (number: number) => void,
  canChangeSettings: bool,
  // Redux state
  loadingStatus: LoadingStatus,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  changeThreadSettings: (
    update: UpdateThreadRequest,
  ) => Promise<ChangeThreadSettingsResult>,
|};
class ThreadSettingsName extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    nameEditValue: PropTypes.string,
    setNameEditValue: PropTypes.func.isRequired,
    nameTextHeight: PropTypes.number,
    setNameTextHeight: PropTypes.func.isRequired,
    canChangeSettings: PropTypes.bool.isRequired,
    loadingStatus: loadingStatusPropType.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    changeThreadSettings: PropTypes.func.isRequired,
  };
  textInput: ?TextInput;

  render() {
    return (
      <View style={styles.row}>
        <Text style={styles.label}>Name</Text>
        {this.renderContent()}
      </View>
    );
  }

  renderContent() {
    if (
      this.props.nameEditValue === null ||
      this.props.nameEditValue === undefined
    ) {
      return (
        <React.Fragment>
          <Text
            style={styles.currentValue}
            onLayout={this.onLayoutText}
          >
            {this.props.threadInfo.uiName}
          </Text>
          <EditSettingButton
            onPress={this.onPressEdit}
            canChangeSettings={this.props.canChangeSettings}
          />
        </React.Fragment>
      );
    }

    let button;
    if (this.props.loadingStatus !== "loading") {
      button = <SaveSettingButton onPress={this.onSubmit} />;
    } else {
      button = <ActivityIndicator size="small" />;
    }

    const textInputStyle = {};
    if (
      this.props.nameTextHeight !== undefined &&
      this.props.nameTextHeight !== null
    ) {
      textInputStyle.height = this.props.nameTextHeight;
    }

    return (
      <React.Fragment>
        <TextInput
          style={[styles.currentValue, textInputStyle]}
          underlineColorAndroid="transparent"
          value={this.props.nameEditValue}
          onChangeText={this.props.setNameEditValue}
          multiline={true}
          autoFocus={true}
          selectTextOnFocus={true}
          onBlur={this.onSubmit}
          editable={this.props.loadingStatus !== "loading"}
          onContentSizeChange={this.onTextInputContentSizeChange}
          ref={this.textInputRef}
        />
        {button}
      </React.Fragment>
    );
  }

  textInputRef = (textInput: ?TextInput) => {
    this.textInput = textInput;
  }

  onLayoutText = (event: { nativeEvent: { layout: { height: number } } }) => {
    this.props.setNameTextHeight(event.nativeEvent.layout.height);
  }

  onTextInputContentSizeChange = (
    event: { nativeEvent: { contentSize: { height: number } } },
  ) => {
    this.props.setNameTextHeight(event.nativeEvent.contentSize.height);
  }

  threadEditName() {
    return this.props.threadInfo.name ? this.props.threadInfo.name : "";
  }

  onPressEdit = () => {
    this.props.setNameEditValue(this.threadEditName());
  }

  onSubmit = () => {
    invariant(
      this.props.nameEditValue !== null &&
        this.props.nameEditValue !== undefined,
      "should be set",
    );
    const name = this.props.nameEditValue.trim();

    if (name === this.threadEditName()) {
      this.props.setNameEditValue(null);
      return;
    }

    this.props.dispatchActionPromise(
      changeThreadSettingsActionTypes,
      this.editName(name),
      { customKeyName: `${changeThreadSettingsActionTypes.started}:name` },
    );
  }

  async editName(newName: string) {
    try {
      const result = await this.props.changeThreadSettings({
        threadID: this.props.threadInfo.id,
        changes: { name: newName },
      });
      this.props.setNameEditValue(null);
      return result;
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
    this.props.setNameEditValue(
      this.threadEditName(),
      () => {
        invariant(this.textInput, "textInput should be set");
        this.textInput.focus();
      },
    );
  }

}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    backgroundColor: "white",
    paddingVertical: 8,
  },
  label: {
    fontSize: 16,
    width: 96,
    color: "#888888",
  },
  currentValue: {
    flex: 1,
    paddingLeft: 4,
    paddingRight: 0,
    paddingVertical: 0,
    margin: 0,
    fontSize: 16,
    color: "#333333",
    fontFamily: 'Arial',
  },
});

const loadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
  `${changeThreadSettingsActionTypes.started}:name`,
);

export default connect(
  (state: AppState) => ({
    loadingStatus: loadingStatusSelector(state),
  }),
  { changeThreadSettings },
)(ThreadSettingsName);
