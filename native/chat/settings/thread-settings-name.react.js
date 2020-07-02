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
import type {
  LayoutEvent,
  ContentSizeChangeEvent,
} from '../../types/react-native';

import * as React from 'react';
import { Text, Alert, ActivityIndicator, TextInput, View } from 'react-native';
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
import {
  type Colors,
  colorsPropType,
  colorsSelector,
  styleSelector,
} from '../../themes/colors';

type Props = {|
  threadInfo: ThreadInfo,
  nameEditValue: ?string,
  setNameEditValue: (value: ?string, callback?: () => void) => void,
  nameTextHeight: ?number,
  setNameTextHeight: (number: number) => void,
  canChangeSettings: boolean,
  // Redux state
  loadingStatus: LoadingStatus,
  colors: Colors,
  styles: typeof styles,
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
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    changeThreadSettings: PropTypes.func.isRequired,
  };
  textInput: ?React.ElementRef<typeof TextInput>;

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
          <Text
            style={this.props.styles.currentValue}
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
          style={[this.props.styles.currentValue, textInputStyle]}
          underlineColorAndroid="transparent"
          value={this.props.nameEditValue}
          onChangeText={this.props.setNameEditValue}
          multiline={true}
          autoFocus={true}
          selectTextOnFocus={true}
          onBlur={this.onSubmit}
          editable={this.props.loadingStatus !== 'loading'}
          onContentSizeChange={this.onTextInputContentSizeChange}
          ref={this.textInputRef}
        />
        {button}
      </React.Fragment>
    );
  }

  textInputRef = (textInput: ?React.ElementRef<typeof TextInput>) => {
    this.textInput = textInput;
  };

  onLayoutText = (event: LayoutEvent) => {
    this.props.setNameTextHeight(event.nativeEvent.layout.height);
  };

  onTextInputContentSizeChange = (event: ContentSizeChangeEvent) => {
    this.props.setNameTextHeight(event.nativeEvent.contentSize.height);
  };

  threadEditName() {
    return this.props.threadInfo.name ? this.props.threadInfo.name : '';
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
    const name = this.props.nameEditValue.trim();

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

const styles = {
  currentValue: {
    color: 'panelForegroundSecondaryLabel',
    flex: 1,
    fontFamily: 'Arial',
    fontSize: 16,
    margin: 0,
    paddingLeft: 4,
    paddingRight: 0,
    paddingVertical: 0,
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
const stylesSelector = styleSelector(styles);

const loadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
  `${changeThreadSettingsActionTypes.started}:name`,
);

export default connect(
  (state: AppState) => ({
    loadingStatus: loadingStatusSelector(state),
    colors: colorsSelector(state),
    styles: stylesSelector(state),
  }),
  { changeThreadSettings },
)(ThreadSettingsName);
