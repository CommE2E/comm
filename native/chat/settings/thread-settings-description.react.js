// @flow

import {
  type ThreadInfo,
  threadInfoPropType,
  threadPermissions,
  type ChangeThreadSettingsResult,
  type UpdateThreadRequest,
} from 'lib/types/thread-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { AppState } from '../../redux/redux-setup';
import { type Colors, colorsPropType } from '../../themes/colors';
import type { Styles } from '../../types/styles';

import * as React from 'react';
import {
  Text,
  Alert,
  ActivityIndicator,
  TextInput,
  View,
} from 'react-native';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import Icon from 'react-native-vector-icons/FontAwesome';

import { connect } from 'lib/utils/redux-utils';
import {
  changeThreadSettingsActionTypes,
  changeThreadSettings,
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
import { colorsSelector, styleSelector } from '../../themes/colors';

type Props = {|
  threadInfo: ThreadInfo,
  descriptionEditValue: ?string,
  setDescriptionEditValue: (value: ?string, callback?: () => void) => void,
  descriptionTextHeight: ?number,
  setDescriptionTextHeight: (number: number) => void,
  canChangeSettings: bool,
  // Redux state
  loadingStatus: LoadingStatus,
  colors: Colors,
  styles: Styles,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  changeThreadSettings: (
    update: UpdateThreadRequest,
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
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    changeThreadSettings: PropTypes.func.isRequired,
  };
  textInput: ?TextInput;

  render() {
    if (
      this.props.descriptionEditValue !== null &&
      this.props.descriptionEditValue !== undefined
    ) {
      let button;
      if (this.props.loadingStatus !== "loading") {
        button = <SaveSettingButton onPress={this.onSubmit} />;
      } else {
        button = (
          <ActivityIndicator
            size="small"
            color={this.props.colors.panelForegroundSecondaryLabel}
          />
        );
      }
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
          <View style={this.props.styles.row}>
            <TextInput
              style={[ this.props.styles.text, textInputStyle ]}
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
          <View style={this.props.styles.row}>
            <Text style={this.props.styles.text} onLayout={this.onLayoutText}>
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
    const { panelIosHighlightUnderlay } = this.props.colors;
    if (canEditThread) {
      return (
        <View>
          <ThreadSettingsCategoryHeader type="outline" title="Description" />
          <View style={this.props.styles.outlineCategory}>
            <Button
              onPress={this.onPressEdit}
              style={this.props.styles.addDescriptionButton}
              iosFormat="highlight"
              iosHighlightUnderlayColor={panelIosHighlightUnderlay}
            >
              <Text style={this.props.styles.addDescriptionText}>
                Add a description...
              </Text>
              <Icon
                name="pencil"
                size={16}
                style={this.props.styles.editIcon}
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
      const result = await this.props.changeThreadSettings({
        threadID: this.props.threadInfo.id,
        changes: { description: newDescription },
      });
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

const styles = {
  row: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    backgroundColor: 'panelForeground',
    paddingVertical: 4,
  },
  text: {
    flex: 1,
    padding: 0,
    margin: 0,
    fontSize: 16,
    color: 'panelForegroundSecondaryLabel',
    fontFamily: 'Arial',
  },
  addDescriptionButton: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  addDescriptionText: {
    fontSize: 16,
    color: 'panelForegroundTertiaryLabel',
    flex: 1,
  },
  outlineCategory: {
    backgroundColor: 'panelSecondaryForeground',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'panelSecondaryForegroundBorder',
    marginLeft: -1,
    marginRight: -1,
    borderRadius: 1,
  },
  editIcon: {
    textAlign: 'right',
    paddingLeft: 10,
    color: 'panelForegroundTertiaryLabel',
  },
};
const stylesSelector = styleSelector(styles);

const loadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
  `${changeThreadSettingsActionTypes.started}:description`,
);

export default connect(
  (state: AppState) => ({
    loadingStatus: loadingStatusSelector(state),
    colors: colorsSelector(state),
    styles: stylesSelector(state),
  }),
  { changeThreadSettings },
)(ThreadSettingsDescription);
