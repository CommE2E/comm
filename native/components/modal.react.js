// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { View, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import KeyboardAvoidingView from './keyboard-avoiding-view.react.js';
import { useStyles } from '../themes/colors.js';
import type { ViewStyle } from '../types/styles.js';
import {
  modalBorderWidth,
  modalMarginHorizontal,
  modalPadding,
} from '../utils/modal-consts.js';

type Props = $ReadOnly<{
  +children: React.Node,
  +containerStyle?: ViewStyle,
  +modalStyle?: ViewStyle,
  +safeAreaEdges?: $ReadOnlyArray<'top' | 'right' | 'bottom' | 'left'>,
  +disableClosing?: boolean,
  +onRequestClose?: () => void,
}>;
function Modal(props: Props): React.Node {
  const navigation = useNavigation();
  const close = React.useCallback(() => {
    if (props.disableClosing) {
      return;
    }
    if (props.onRequestClose) {
      props.onRequestClose();
    } else if (navigation.isFocused()) {
      navigation.goBack();
    }
  }, [navigation, props]);

  const styles = useStyles(unboundStyles);
  const { containerStyle, modalStyle, children, safeAreaEdges } = props;
  return (
    <SafeAreaView style={styles.container} edges={safeAreaEdges}>
      <KeyboardAvoidingView
        behavior="padding"
        style={[styles.container, containerStyle]}
      >
        <TouchableWithoutFeedback onPress={close}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <View style={[styles.modal, modalStyle]}>{children}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const unboundStyles = {
  container: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'visible',
  },
  modal: {
    backgroundColor: 'modalBackground',
    borderColor: 'modalForegroundBorder',
    borderWidth: modalBorderWidth,
    borderRadius: 5,
    flex: 1,
    justifyContent: 'center',
    marginBottom: 30,
    marginHorizontal: modalMarginHorizontal,
    marginTop: 100,
    padding: modalPadding,
  },
};

export default Modal;
