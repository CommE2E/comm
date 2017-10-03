
// @flow

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import Button from '../../components/button.react';

type ThreadSettingsAddListItemProps = {
  onPress: () => void,
  text: string,
};
function ThreadSettingsAddListItem(props: ThreadSettingsAddListItemProps) {
  return (
    <Button
      onPress={props.onPress}
    >
      <View style={styles.container}>
        <Text style={styles.text}>{props.text}</Text>
        <Icon
          name={"md-add"}
          size={20}
          color="#009900"
        />
      </View>
    </Button>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontSize: 16,
    color: "#036AFF",
    fontStyle: 'italic',
  },
});

export default ThreadSettingsAddListItem;
