// @flow

import invariant from 'invariant';
import * as React from 'react';
import {
  Text,
  Alert,
  ActivityIndicator,
  TextInput as BaseTextInput,
  View,
} from 'react-native';

import {
  changeThreadSettingsActionTypes,
  changeThreadSettings,
} from 'lib/actions/thread-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { threadHasPermission } from 'lib/shared/thread-utils.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import {
  type ThreadInfo,
  threadPermissions,
  type ChangeThreadSettingsPayload,
  type UpdateThreadRequest,
} from 'lib/types/thread-types.js';
import {
  type DispatchActionPromise,
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import SaveSettingButton from './save-setting-button.react.js';
import {
  ThreadSettingsCategoryHeader,
  ThreadSettingsCategoryFooter,
} from './thread-settings-category.react.js';
import Button from '../../components/button.react.js';
import EditSettingButton from '../../components/edit-setting-button.react.js';
import SWMansionIcon from '../../components/swmansion-icon.react.js';
import TextInput from '../../components/text-input.react.js';
import { useSelector } from '../../redux/redux-utils.js';
import { type Colors, useStyles, useColors } from '../../themes/colors.js';
import type {
  LayoutEvent,
  ContentSizeChangeEvent,
} from '../../types/react-native.js';

type BaseProps = {
  +threadInfo: ThreadInfo,
  +descriptionEditValue: ?string,
  +setDescriptionEditValue: (value: ?string, callback?: () => void) => void,
  +descriptionTextHeight: ?number,
  +setDescriptionTextHeight: (number: number) => void,
  +canChangeSettings: boolean,
};
type Props = {
  ...BaseProps,
  // Redux state
  +loadingStatus: LoadingStatus,
  +colors: Colors,
  +styles: typeof unboundStyles,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +changeThreadSettings: (
    update: UpdateThreadRequest,
  ) => Promise<ChangeThreadSettingsPayload>,
};
class ThreadSettingsDescription extends React.PureComponent<Props> {
  textInput: ?React.ElementRef<typeof BaseTextInput>;

  render() {
    if (
      this.props.descriptionEditValue !== null &&
      this.props.descriptionEditValue !== undefined
    ) {
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
              style={[this.props.styles.text, textInputStyle]}
              value={this.props.descriptionEditValue}
              onChangeText={this.props.setDescriptionEditValue}
              multiline={true}
              autoFocus={true}
              selectTextOnFocus={true}
              onBlur={this.onSubmit}
              editable={this.props.loadingStatus !== 'loading'}
              onContentSizeChange={this.onTextInputContentSizeChange}
              ref={this.textInputRef}
              selectionColor={`#${this.props.threadInfo.color}`}
            />
            {this.renderButton()}
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
            {this.renderButton()}
          </View>
          <ThreadSettingsCategoryFooter type="full" />
        </View>
      );
    }

    const canEditThreadDescription = threadHasPermission(
      this.props.threadInfo,
      threadPermissions.EDIT_THREAD_DESCRIPTION,
    );
    const { panelIosHighlightUnderlay } = this.props.colors;
    if (canEditThreadDescription) {
      return (
        <View>
          <ThreadSettingsCategoryHeader type="outline" title="Description" />
          <View style={this.props.styles.outlineCategory}>
            <Button
              onPress={this.onPressEdit}
              style={this.props.styles.addDescriptionButton}
              iosFormat="highlight"
              iosHighlightUnderlayColor={panelIosHighlightUnderlay}
              iosActiveOpacity={0.85}
            >
              <Text style={this.props.styles.addDescriptionText}>
                Add a description...
              </Text>
              <SWMansionIcon
                name="edit-1"
                size={20}
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

  renderButton() {
    if (this.props.loadingStatus === 'loading') {
      return (
        <ActivityIndicator
          size="small"
          color={this.props.colors.panelForegroundSecondaryLabel}
        />
      );
    } else if (
      this.props.descriptionEditValue === null ||
      this.props.descriptionEditValue === undefined
    ) {
      return (
        <EditSettingButton
          onPress={this.onPressEdit}
          canChangeSettings={this.props.canChangeSettings}
        />
      );
    }
    return <SaveSettingButton onPress={this.onSubmit} />;
  }

  textInputRef = (textInput: ?React.ElementRef<typeof BaseTextInput>) => {
    this.textInput = textInput;
  };

  onLayoutText = (event: LayoutEvent) => {
    this.props.setDescriptionTextHeight(event.nativeEvent.layout.height);
  };

  onTextInputContentSizeChange = (event: ContentSizeChangeEvent) => {
    this.props.setDescriptionTextHeight(event.nativeEvent.contentSize.height);
  };

  onPressEdit = () => {
    this.props.setDescriptionEditValue(this.props.threadInfo.description);
  };

  onSubmit = () => {
    invariant(
      this.props.descriptionEditValue !== null &&
        this.props.descriptionEditValue !== undefined,
      'should be set',
    );
    const description = this.props.descriptionEditValue.trim();

    if (description === this.props.threadInfo.description) {
      this.props.setDescriptionEditValue(null);
      return;
    }

    const editDescriptionPromise = this.editDescription(description);
    const action = changeThreadSettingsActionTypes.started;
    const threadID = this.props.threadInfo.id;

    this.props.dispatchActionPromise(
      changeThreadSettingsActionTypes,
      editDescriptionPromise,
      {
        customKeyName: `${action}:${threadID}:description`,
      },
    );
    editDescriptionPromise.then(() => {
      this.props.setDescriptionEditValue(null);
    });
  };

  async editDescription(newDescription: string) {
    try {
      return await this.props.changeThreadSettings({
        threadID: this.props.threadInfo.id,
        changes: { description: newDescription },
      });
    } catch (e) {
      Alert.alert(
        'Unknown error',
        'Uhh... try again?',
        [{ text: 'OK', onPress: this.onErrorAcknowledged }],
        { cancelable: false },
      );
      throw e;
    }
  }

  onErrorAcknowledged = () => {
    this.props.setDescriptionEditValue(
      this.props.threadInfo.description,
      () => {
        invariant(this.textInput, 'textInput should be set');
        this.textInput.focus();
      },
    );
  };
}

const unboundStyles = {
  addDescriptionButton: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  addDescriptionText: {
    color: 'panelForegroundTertiaryLabel',
    flex: 1,
    fontSize: 16,
  },
  editIcon: {
    color: 'panelForegroundTertiaryLabel',
    paddingLeft: 10,
    textAlign: 'right',
  },
  outlineCategory: {
    backgroundColor: 'panelForeground',
    borderColor: 'panelForegroundBorder',
    borderRadius: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginLeft: -1,
    marginRight: -1,
  },
  row: {
    backgroundColor: 'panelForeground',
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 4,
  },
  text: {
    color: 'panelForegroundSecondaryLabel',
    flex: 1,
    fontFamily: 'Arial',
    fontSize: 16,
    margin: 0,
    padding: 0,
    borderBottomColor: 'transparent',
  },
};

const ConnectedThreadSettingsDescription: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedThreadSettingsDescription(
    props: BaseProps,
  ) {
    const threadID = props.threadInfo.id;
    const loadingStatus = useSelector(
      createLoadingStatusSelector(
        changeThreadSettingsActionTypes,
        `${changeThreadSettingsActionTypes.started}:${threadID}:description`,
      ),
    );
    const colors = useColors();
    const styles = useStyles(unboundStyles);

    const dispatchActionPromise = useDispatchActionPromise();
    const callChangeThreadSettings = useServerCall(changeThreadSettings);
    return (
      <ThreadSettingsDescription
        {...props}
        loadingStatus={loadingStatus}
        colors={colors}
        styles={styles}
        dispatchActionPromise={dispatchActionPromise}
        changeThreadSettings={callChangeThreadSettings}
      />
    );
  });

export default ConnectedThreadSettingsDescription;
