// @flow

import type { AppState } from '../../redux/redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import {
  type ThreadInfo,
  threadInfoPropType,
  type ChangeThreadSettingsResult,
  type UpdateThreadRequest,
} from 'lib/types/thread-types';
import type { RootNavigationProp } from '../../navigation/root-navigator.react';
import type { NavigationRoute } from '../../navigation/route-names';

import * as React from 'react';
import PropTypes from 'prop-types';
import { TouchableHighlight, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import { connect } from 'lib/utils/redux-utils';
import {
  changeThreadSettingsActionTypes,
  changeThreadSettings,
} from 'lib/actions/thread-actions';

import Modal from '../../components/modal.react';
import ColorPicker from '../../components/color-picker.react';
import {
  type Colors,
  colorsPropType,
  colorsSelector,
  styleSelector,
} from '../../themes/colors';

export type ColorPickerModalParams = {|
  presentedFrom: string,
  color: string,
  threadInfo: ThreadInfo,
  setColor: (color: string) => void,
|};

type Props = {|
  navigation: RootNavigationProp<'ColorPickerModal'>,
  route: NavigationRoute<'ColorPickerModal'>,
  // Redux state
  colors: Colors,
  styles: typeof styles,
  windowWidth: number,
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
      goBackOnce: PropTypes.func.isRequired,
    }).isRequired,
    route: PropTypes.shape({
      params: PropTypes.shape({
        color: PropTypes.string.isRequired,
        threadInfo: threadInfoPropType.isRequired,
        setColor: PropTypes.func.isRequired,
      }).isRequired,
    }).isRequired,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    windowWidth: PropTypes.number.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    changeThreadSettings: PropTypes.func.isRequired,
  };

  render() {
    const { color, threadInfo } = this.props.route.params;
    // Based on the assumption we are always in portrait,
    // and consequently width is the lowest dimensions
    const modalStyle = { height: this.props.windowWidth - 5 };
    return (
      <Modal
        navigation={this.props.navigation}
        modalStyle={[this.props.styles.colorPickerContainer, modalStyle]}
      >
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

const styles = {
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
const stylesSelector = styleSelector(styles);

export default connect(
  (state: AppState) => ({
    colors: colorsSelector(state),
    styles: stylesSelector(state),
    windowWidth: state.dimensions.width,
  }),
  { changeThreadSettings },
)(ColorPickerModal);
