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
import { chatNameMaxLength } from 'lib/shared/thread-utils.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import {
  type ResolvedThreadInfo,
  type ChangeThreadSettingsPayload,
  type UpdateThreadRequest,
} from 'lib/types/thread-types.js';
import {
  type DispatchActionPromise,
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';
import { firstLine } from 'lib/utils/string-utils.js';

import SaveSettingButton from './save-setting-button.react.js';
import EditSettingButton from '../../components/edit-setting-button.react.js';
import { SingleLine } from '../../components/single-line.react.js';
import TextInput from '../../components/text-input.react.js';
import { useSelector } from '../../redux/redux-utils.js';
import { type Colors, useStyles, useColors } from '../../themes/colors.js';

type BaseProps = {
  +threadInfo: ResolvedThreadInfo,
  +nameEditValue: ?string,
  +setNameEditValue: (value: ?string, callback?: () => void) => void,
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
class ThreadSettingsName extends React.PureComponent<Props> {
  textInput: ?React.ElementRef<typeof BaseTextInput>;

  render() {
    return (
      <View style={this.props.styles.row}>
        <Text style={this.props.styles.label}>Name</Text>
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
          <SingleLine style={this.props.styles.currentValue}>
            {this.props.threadInfo.uiName}
          </SingleLine>
          <EditSettingButton
            onPress={this.onPressEdit}
            canChangeSettings={this.props.canChangeSettings}
          />
        </React.Fragment>
      );
    }

    let button;
    if (this.props.loadingStatus !== 'loading') {
      button = <SaveSettingButton onPress={this.onSubmit} />;
    } else {
      button = (
        <ActivityIndicator
          size="small"
          color={this.props.colors.panelForegroundSecondaryLabel}
        />
      );
    }

    return (
      <React.Fragment>
        <TextInput
          style={this.props.styles.currentValue}
          value={this.props.nameEditValue}
          onChangeText={this.props.setNameEditValue}
          autoFocus={true}
          selectTextOnFocus={true}
          onBlur={this.onSubmit}
          editable={this.props.loadingStatus !== 'loading'}
          ref={this.textInputRef}
          selectionColor={`#${this.props.threadInfo.color}`}
          maxLength={chatNameMaxLength}
        />
        {button}
      </React.Fragment>
    );
  }

  textInputRef = (textInput: ?React.ElementRef<typeof BaseTextInput>) => {
    this.textInput = textInput;
  };

  threadEditName() {
    return firstLine(
      this.props.threadInfo.name ? this.props.threadInfo.name : '',
    );
  }

  onPressEdit = () => {
    this.props.setNameEditValue(this.threadEditName());
  };

  onSubmit = () => {
    invariant(
      this.props.nameEditValue !== null &&
        this.props.nameEditValue !== undefined,
      'should be set',
    );
    const name = firstLine(this.props.nameEditValue);

    if (name === this.threadEditName()) {
      this.props.setNameEditValue(null);
      return;
    }

    const editNamePromise = this.editName(name);
    this.props.dispatchActionPromise(
      changeThreadSettingsActionTypes,
      editNamePromise,
      { customKeyName: `${changeThreadSettingsActionTypes.started}:name` },
    );
    editNamePromise.then(() => {
      this.props.setNameEditValue(null);
    });
  };

  async editName(newName: string) {
    try {
      return await this.props.changeThreadSettings({
        threadID: this.props.threadInfo.id,
        changes: { name: newName },
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
    this.props.setNameEditValue(this.threadEditName(), () => {
      invariant(this.textInput, 'textInput should be set');
      this.textInput.focus();
    });
  };
}

const unboundStyles = {
  currentValue: {
    color: 'panelForegroundSecondaryLabel',
    flex: 1,
    fontFamily: 'Arial',
    fontSize: 16,
    margin: 0,
    paddingLeft: 4,
    paddingRight: 0,
    paddingVertical: 0,
    borderBottomColor: 'transparent',
  },
  label: {
    color: 'panelForegroundTertiaryLabel',
    fontSize: 16,
    width: 96,
  },
  row: {
    backgroundColor: 'panelForeground',
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
};

const loadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
  `${changeThreadSettingsActionTypes.started}:name`,
);

const ConnectedThreadSettingsName: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedThreadSettingsName(props: BaseProps) {
    const styles = useStyles(unboundStyles);
    const colors = useColors();
    const loadingStatus = useSelector(loadingStatusSelector);

    const dispatchActionPromise = useDispatchActionPromise();
    const callChangeThreadSettings = useServerCall(changeThreadSettings);

    return (
      <ThreadSettingsName
        {...props}
        styles={styles}
        colors={colors}
        loadingStatus={loadingStatus}
        dispatchActionPromise={dispatchActionPromise}
        changeThreadSettings={callChangeThreadSettings}
      />
    );
  });

export default ConnectedThreadSettingsName;
