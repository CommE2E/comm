// @flow

import type {
  StyleObj,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes';

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import Button from '../../components/button.react';

type Props = {
  onPress: () => void,
  text: string,
  iconName: string,
  iconColor: string,
  iconSize: number,
  iconStyle?: StyleObj,
};
function ThreadSettingsListAction(props: Props) {
  return (
    <Button onPress={props.onPress}>
      <View style={styles.container}>
        <Text style={styles.text}>{props.text}</Text>
        <Icon
          name={props.iconName}
          size={props.iconSize}
          color={props.iconColor}
          style={[styles.icon, props.iconStyle]}
        />
      </View>
    </Button>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontSize: 16,
    color: "#036AFF",
    fontStyle: 'italic',
  },
  icon: {
    lineHeight: 20,
  },
});

export default ThreadSettingsListAction;
