// @flow

import * as React from 'react';
import { TouchableHighlight, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import {
  changeThreadSettingsActionTypes,
  changeThreadSettings,
} from 'lib/actions/thread-actions';
import {
  type ThreadInfo,
  type ChangeThreadSettingsPayload,
  type UpdateThreadRequest,
} from 'lib/types/thread-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import ColorPicker from '../../components/color-picker.react';
import Modal from '../../components/modal.react';
import type { RootNavigationProp } from '../../navigation/root-navigator.react';
import type { NavigationRoute } from '../../navigation/route-names';
import { useSelector } from '../../redux/redux-utils';
import { type Colors, useStyles, useColors } from '../../themes/colors';

export type ColorPickerModalParams = {|
  presentedFrom: string,
  color: string,
  threadInfo: ThreadInfo,
  setColor: (color: string) => void,
|};

type BaseProps = {|
  +navigation: RootNavigationProp<'ColorPickerModal'>,
  +route: NavigationRoute<'ColorPickerModal'>,
|};
type Props = {|
  ...BaseProps,
  // Redux state
  +colors: Colors,
  +styles: typeof unboundStyles,
  +windowWidth: number,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +changeThreadSettings: (
    request: UpdateThreadRequest,
  ) => Promise<ChangeThreadSettingsPayload>,
|};
class ColorPickerModal extends React.PureComponent<Props> {
  render() {
    const { color, threadInfo } = this.props.route.params;
    // Based on the assumption we are always in portrait,
    // and consequently width is the lowest dimensions
    const modalStyle = { height: this.props.windowWidth - 5 };
    return (
      <Modal modalStyle={[this.props.styles.colorPickerContainer, modalStyle]}>
        <ColorPicker
          defaultColor={color}
          oldColor={threadInfo.color}
          onColorSelected={this.onColorSelected}
          style={this.props.styles.colorPicker}
        />
        <TouchableHighlight
          onPress={this.close}
          style={this.props.styles.closeButton}
          underlayColor={this.props.colors.modalIosHighlightUnderlay}
        >
          <Icon
            name="close"
            size={16}
            style={this.props.styles.closeButtonIcon}
          />
        </TouchableHighlight>
      </Modal>
    );
  }

  close = () => {
    this.props.navigation.goBackOnce();
  };

  onColorSelected = (color: string) => {
    const colorEditValue = color.substr(1);
    this.props.route.params.setColor(colorEditValue);
    this.close();
    this.props.dispatchActionPromise(
      changeThreadSettingsActionTypes,
      this.editColor(colorEditValue),
      { customKeyName: `${changeThreadSettingsActionTypes.started}:color` },
    );
  };

  async editColor(newColor: string) {
    const threadID = this.props.route.params.threadInfo.id;
    try {
      return await this.props.changeThreadSettings({
        threadID,
        changes: { color: newColor },
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
    const { threadInfo, setColor } = this.props.route.params;
    setColor(threadInfo.color);
  };
}

const unboundStyles = {
  closeButton: {
    borderRadius: 3,
    height: 18,
    position: 'absolute',
    right: 5,
    top: 5,
    width: 18,
  },
  closeButtonIcon: {
    color: 'modalBackgroundSecondaryLabel',
    left: 3,
    position: 'absolute',
  },
  colorPicker: {
    bottom: 10,
    left: 10,
    position: 'absolute',
    right: 10,
    top: 10,
  },
  colorPickerContainer: {
    backgroundColor: 'modalBackground',
    borderRadius: 5,
    flex: 0,
    marginHorizontal: 15,
    marginVertical: 20,
  },
};

export default React.memo<BaseProps>(function ConnectedColorPickerModal(
  props: BaseProps,
) {
  const styles = useStyles(unboundStyles);
  const colors = useColors();
  const windowWidth = useSelector(state => state.dimensions.width);

  const dispatchActionPromise = useDispatchActionPromise();
  const callChangeThreadSettings = useServerCall(changeThreadSettings);

  return (
    <ColorPickerModal
      {...props}
      styles={styles}
      colors={colors}
      windowWidth={windowWidth}
      dispatchActionPromise={dispatchActionPromise}
      changeThreadSettings={callChangeThreadSettings}
    />
  );
});
