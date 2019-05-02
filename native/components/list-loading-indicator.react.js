// @flow

import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

class ListLoadingIndicator extends React.PureComponent<{||}> {

  render() {
    return (
      <ActivityIndicator
        color="black"
        size="large"
        style={styles.loadingIndicator}
      />
    );
  }

}

const styles = StyleSheet.create({
  loadingIndicator: {
    flex: 1,
    backgroundColor: 'white',
    padding: 10,
  },
});

export default ListLoadingIndicator;
