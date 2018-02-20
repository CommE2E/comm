// @flow

import {
  type ThreadInfo,
  threadInfoPropType,
  threadPermissions,
  type ChangeThreadSettingsResult,
} from 'lib/types/thread-types';
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
  TextInput,
  View,
} from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import Icon from 'react-native-vector-icons/FontAwesome';

import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import {
  changeThreadSettingsActionTypes,
  changeSingleThreadSetting,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { threadHasPermission } from 'lib/shared/thread-utils';

import EditSettingButton from '../../components/edit-setting-button.react';
import SaveSettingButton from './save-setting-button.react';
import {
  ThreadSettingsCategoryHeader,
  ThreadSettingsCategoryFooter,
} from './thread-settings-category.react';
import Button from '../../components/button.react';

type Props = {|
  threadInfo: ThreadInfo,
  descriptionEditValue: ?string,
  setDescriptionEditValue: (value: ?string, callback?: () => void) => void,
  descriptionTextHeight: ?number,
  setDescriptionTextHeight: (number: number) => void,
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
class ThreadSettingsDescription extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    descriptionEditValue: PropTypes.string,
    setDescriptionEditValue: PropTypes.func.isRequired,
    descriptionTextHeight: PropTypes.number,
    setDescriptionTextHeight: PropTypes.func.isRequired,
    canChangeSettings: PropTypes.bool.isRequired,
    loadingStatus: loadingStatusPropType.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    changeSingleThreadSetting: PropTypes.func.isRequired,
  };
  textInput: ?TextInput;

  render() {
    if (
      this.props.descriptionEditValue !== null &&
      this.props.descriptionEditValue !== undefined
    ) {
      const button = this.props.loadingStatus !== "loading"
        ? <SaveSettingButton onPress={this.onSubmit} />
        : <ActivityIndicator size="small" />;
      const textInputStyle = {};
      if (
        this.props.descriptionTextHeight !== undefined &&
        this.props.descriptionTextHeight !== null
      ) {
        textInputStyle.height = this.props.descriptionTextHeight;
      }
      return (
        <View>
          <ThreadSettingsCategoryHeader type="full" title="Description" />
          <View style={styles.row}>
            <TextInput
              style={[ styles.text, textInputStyle ]}
              underlineColorAndroid="transparent"
              value={this.props.descriptionEditValue}
              onChangeText={this.props.setDescriptionEditValue}
              multiline={true}
              autoFocus={true}
              selectTextOnFocus={true}
              onBlur={this.onSubmit}
              editable={this.props.loadingStatus !== "loading"}
              onContentSizeChange={this.onTextInputContentSizeChange}
              ref={this.textInputRef}
            />
            {button}
          </View>
          <ThreadSettingsCategoryFooter type="full" />
        </View>
      );
    }

    if (this.props.threadInfo.description) {
      return (
        <View>
          <ThreadSettingsCategoryHeader type="full" title="Description" />
          <View style={styles.row}>
            <Text style={styles.text} onLayout={this.onLayoutText}>
              {this.props.threadInfo.description}
            </Text>
            <EditSettingButton
              onPress={this.onPressEdit}
              canChangeSettings={this.props.canChangeSettings}
              key="editButton"
            />
          </View>
          <ThreadSettingsCategoryFooter type="full" />
        </View>
      );
    }

    const canEditThread = threadHasPermission(
      this.props.threadInfo,
      threadPermissions.EDIT_THREAD,
    );
    if (canEditThread) {
      return (
        <View>
          <ThreadSettingsCategoryHeader type="outline" title="Description" />
          <View style={styles.outlineCategory}>
            <Button
              onPress={this.onPressEdit}
              style={styles.addDescriptionButton}
              iosFormat="highlight"
              iosHighlightUnderlayColor="#EEEEEEDD"
            >
              <Text style={styles.addDescriptionText}>
                Add a description...
              </Text>
              <Icon
                name="pencil"
                size={16}
                style={styles.editIcon}
                color="#888888"
              />
            </Button>
          </View>
          <ThreadSettingsCategoryFooter type="outline" />
        </View>
      );
    }

    return null;
  }

  textInputRef = (textInput: ?TextInput) => {
    this.textInput = textInput;
  }

  onLayoutText = (event: { nativeEvent: { layout: { height: number } } }) => {
    this.props.setDescriptionTextHeight(event.nativeEvent.layout.height);
  }

  onTextInputContentSizeChange = (
    event: { nativeEvent: { contentSize: { height: number } } },
  ) => {
    this.props.setDescriptionTextHeight(event.nativeEvent.contentSize.height);
  }

  onPressEdit = () => {
    this.props.setDescriptionEditValue(this.props.threadInfo.description);
  }

  onSubmit = () => {
    invariant(
      this.props.descriptionEditValue !== null &&
        this.props.descriptionEditValue !== undefined,
      "should be set",
    );
    const description = this.props.descriptionEditValue.trim();

    if (description === this.props.threadInfo.description) {
      this.props.setDescriptionEditValue(null);
      return;
    }

    this.props.dispatchActionPromise(
      changeThreadSettingsActionTypes,
      this.editDescription(description),
      {
        customKeyName: `${changeThreadSettingsActionTypes.started}:description`,
      },
    );
  }

  async editDescription(newDescription: string) {
    try {
      const result = await this.props.changeSingleThreadSetting(
        this.props.threadInfo.id,
        "description",
        newDescription,
      );
      this.props.setDescriptionEditValue(null);
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
    this.props.setDescriptionEditValue(
      this.props.threadInfo.description,
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
    paddingVertical: 4,
  },
  text: {
    flex: 1,
    padding: 0,
    margin: 0,
    fontSize: 16,
    color: "#333333",
    fontFamily: 'Arial',
  },
  addDescriptionButton: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  addDescriptionText: {
    fontSize: 16,
    color: "#888888",
    flex: 1,
  },
  outlineCategory: {
    backgroundColor: "#F5F5F5FF",
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: "#CCCCCC",
    marginLeft: -1,
    marginRight: -1,
    borderRadius: 1,
  },
  editIcon: {
    textAlign: 'right',
    paddingLeft: 10,
  },
});

const loadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
  `${changeThreadSettingsActionTypes.started}:description`,
);

export default connect(
  (state: AppState) => ({
    loadingStatus: loadingStatusSelector(state),
    cookie: state.cookie,
  }),
  includeDispatchActionProps,
  bindServerCalls({ changeSingleThreadSetting }),
)(ThreadSettingsDescription);
