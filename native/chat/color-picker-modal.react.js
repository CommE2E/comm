// @flow

import React from 'react';
import PropTypes from 'prop-types';
import { View, TouchableHighlight, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/FontAwesome';

import ColorPicker from '../components/color-picker.react';

type Props = {|
  isVisible: bool,
  closeModal: () => void,
  color: string,
  oldColor?: ?string,
  onColorSelected: (color: string) => void,
|};
class ColorPickerModal extends React.PureComponent<Props> {

  static propTypes = {
    isVisible: PropTypes.bool.isRequired,
    closeModal: PropTypes.func.isRequired,
    color: PropTypes.string.isRequired,
    oldColor: PropTypes.string,
    onColorSelected: PropTypes.func.isRequired,
  };

  render() {
    return (
      <Modal
        isVisible={this.props.isVisible}
        onBackButtonPress={this.props.closeModal}
        onBackdropPress={this.props.closeModal}
      >
        <View style={styles.colorPickerContainer}>
          <ColorPicker
            defaultColor={this.props.color}
            oldColor={this.props.oldColor}
            onColorSelected={this.props.onColorSelected}
            style={styles.colorPicker}
          />
          <TouchableHighlight
            onPress={this.props.closeModal}
            style={styles.closeButton}
            underlayColor="#CCCCCCDD"
          >
            <Icon
              name="close"
              size={16}
              color="#AAAAAA"
              style={styles.closeButtonIcon}
            />
          </TouchableHighlight>
        </View>
      </Modal>
    );
  }

}

const styles = StyleSheet.create({
  colorPickerContainer: {
    height: 350,
    backgroundColor: '#EEEEEE',
    marginVertical: 20,
    marginHorizontal: 15,
    borderRadius: 5,
  },
  colorPicker: {
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
    position: 'absolute',
  },
  closeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 3,
  },
  closeButtonIcon: {
    position: 'absolute',
    left: 3,
  },
});

export default ColorPickerModal;
