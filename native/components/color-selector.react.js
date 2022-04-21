// @flow

import * as React from 'react';
import { Text, View, StyleSheet } from 'react-native';

import ColorSelectorButton from './color-selector-button.react';

function ColorSelector(): React.Node {
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.text}>Select thread color</Text>
      </View>
      <View style={styles.colorButtons}>
        <ColorSelectorButton color="#4B87AA" />
        <ColorSelectorButton color="#5C9F5F" />
        <ColorSelectorButton color="#B8753D" />
        <ColorSelectorButton color="#AA4B4B" />
        <ColorSelectorButton color="#6D49AB" />
        <ColorSelectorButton color="#C85000" />
        <ColorSelectorButton color="#008F83" />
        <ColorSelectorButton color="#648CAA" />
        <ColorSelectorButton color="#57697F" />
        <ColorSelectorButton color="#575757" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  colorButtons: {
    alignItems: 'center',
    display: 'flex',
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  container: {
    alignItems: 'center',
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  text: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  textContainer: {
    margin: 20,
  },
});

export default ColorSelector;
