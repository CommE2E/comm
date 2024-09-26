// @flow

import * as React from 'react';
import { Text, View, StyleSheet } from 'react-native';

import Modal from './modal.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

type Props = {
  +navigation: RootNavigationProp<'CommunityJoinerModal'>,
  +route: NavigationRoute<'CommunityJoinerModal'>,
};

// eslint-disable-next-line no-unused-vars
function CommunityJoinerModal(props: Props): React.Node {
  return (
    <Modal modalStyle={styles.modal}>
      <View style={styles.modalContent}>
        <Text style={styles.modalHeader}>Community Joiner</Text>
        <Text style={styles.modalBody}>
          This is placeholder content for the modal.
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#FFFFFF',
    flex: 0,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  modalBody: {
    color: '#333333',
    fontSize: 16,
    textAlign: 'center',
  },
  modalContent: {
    alignItems: 'center',
    padding: 20,
  },
  modalHeader: {
    color: '#000000',
    fontSize: 24,
    marginBottom: 10,
  },
});

export default CommunityJoinerModal;
