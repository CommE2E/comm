// @flow

import invariant from 'invariant';
import * as React from 'react';
import {
  Text,
  ActivityIndicator,
  TextInput as BaseTextInput,
  View,
} from 'react-native';

import { changeThreadSettingsActionTypes } from 'lib/actions/thread-action-types.js';
import { useChangeThreadSettings } from 'lib/hooks/thread-hooks.js';
import type { UseChangeThreadSettingsInput } from 'lib/hooks/thread-hooks.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { ResolvedThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { ChangeThreadSettingsPayload } from 'lib/types/thread-types.js';
import {
  useDispatchActionPromise,
  type DispatchActionPromise,
} from 'lib/utils/redux-promise-utils.js';
import { firstLine } from 'lib/utils/string-utils.js';
import { chatNameMaxLength } from 'lib/utils/validation-utils.js';

import SaveSettingButton from './save-setting-button.react.js';
import EditSettingButton from '../../components/edit-setting-button.react.js';
import SingleLine from '../../components/single-line.react.js';
import TextInput from '../../components/text-input.react.js';
import { useSelector } from '../../redux/redux-utils.js';
import { type Colors, useStyles, useColors } from '../../themes/colors.js';
import { unknownErrorAlertDetails } from '../../utils/alert-messages.js';
import Alert from '../../utils/alert.js';

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
  +styles: $ReadOnly<typeof unboundStyles>,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +changeThreadSettings: (
    input: UseChangeThreadSettingsInput,
  ) => Promise<ChangeThreadSettingsPayload>,
};
class ThreadSettingsName extends React.PureComponent<Props> {
  textInput: ?React.ElementRef<typeof BaseTextInput>;

  render(): React.Node {
    return (
      <View style={this.props.styles.row}>
        <Text style={this.props.styles.label}>Name</Text>
        {this.renderContent()}
      </View>
    );
  }

  renderButton(): React.Node {
    if (this.props.loadingStatus === 'loading') {
      return (
        <ActivityIndicator
          size="small"
          color={this.props.colors.panelForegroundSecondaryLabel}
        />
      );
    } else if (
      this.props.nameEditValue === null ||
      this.props.nameEditValue === undefined
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

  renderContent(): React.Node {
    if (
      this.props.nameEditValue === null ||
      this.props.nameEditValue === undefined
    ) {
      return (
        <React.Fragment>
          <SingleLine style={this.props.styles.currentValue}>
            {this.props.threadInfo.uiName}
          </SingleLine>
          {this.renderButton()}
        </React.Fragment>
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
        {this.renderButton()}
      </React.Fragment>
    );
  }

  textInputRef = (textInput: ?React.ElementRef<typeof BaseTextInput>) => {
    this.textInput = textInput;
  };

  threadEditName(): string {
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
    const action = changeThreadSettingsActionTypes.started;
    const threadID = this.props.threadInfo.id;

    void this.props.dispatchActionPromise(
      changeThreadSettingsActionTypes,
      editNamePromise,
      {
        customKeyName: `${action}:${threadID}:name`,
      },
    );
    void editNamePromise.then(() => {
      this.props.setNameEditValue(null);
    });
  };

  async editName(newName: string): Promise<ChangeThreadSettingsPayload> {
    try {
      const changeThreadSettingsInput = {
        threadInfo: this.props.threadInfo,
        threadID: this.props.threadInfo.id,
        changes: { name: newName },
      };

      return await this.props.changeThreadSettings(changeThreadSettingsInput);
    } catch (e) {
      Alert.alert(
        unknownErrorAlertDetails.title,
        unknownErrorAlertDetails.message,
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

const ConnectedThreadSettingsName: React.ComponentType<BaseProps> = React.memo<
  BaseProps,
  void,
>(function ConnectedThreadSettingsName(props: BaseProps) {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const threadID = props.threadInfo.id;
  const loadingStatus = useSelector(
    createLoadingStatusSelector(
      changeThreadSettingsActionTypes,
      `${changeThreadSettingsActionTypes.started}:${threadID}:name`,
    ),
  );

  const dispatchActionPromise = useDispatchActionPromise();
  const callChangeThreadSettings = useChangeThreadSettings();

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
