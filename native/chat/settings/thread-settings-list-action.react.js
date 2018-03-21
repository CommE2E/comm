// @flow

import type {
  StyleObj,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes';

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import Button from '../../components/button.react';

type ListActionProps = {|
  onPress: () => void,
  text: string,
  iconName: string,
  iconColor: string,
  iconSize: number,
  iconStyle?: StyleObj,
|};
function ThreadSettingsListAction(props: ListActionProps) {
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

type SeeMoreProps = {|
  onPress: () => void,
|};
function ThreadSettingsSeeMore(props: SeeMoreProps) {
  return (
    <View style={styles.seeMoreRow}>
      <View style={styles.seeMoreContents}>
        <ThreadSettingsListAction
          onPress={props.onPress}
          text="See more..."
          iconName="ios-more"
          iconColor="#036AFF"
          iconSize={36}
          iconStyle={styles.seeMoreIcon}
        />
      </View>
    </View>
  );
}

type AddMemberProps = {|
  onPress: () => void,
|};
function ThreadSettingsAddMember(props: AddMemberProps) {
  return (
    <View style={styles.addItemRow}>
      <ThreadSettingsListAction
        onPress={props.onPress}
        text="Add users"
        iconName="md-add"
        iconColor="#009900"
        iconSize={20}
      />
    </View>
  );
}

type AddChildThreadProps = {|
  onPress: () => void,
|};
class ThreadSettingsAddChildThread
  extends React.PureComponent<AddChildThreadProps> {

  render() {
    return (
      <View style={styles.addItemRow}>
        <ThreadSettingsListAction
          onPress={this.props.onPress}
          text="Add child thread"
          iconName="md-add"
          iconColor="#009900"
          iconSize={20}
        />
      </View>
    );
  }

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
  seeMoreRow: {
    paddingHorizontal: 12,
    backgroundColor: "white",
  },
  seeMoreContents: {
    borderTopWidth: 1,
    borderColor: "#CCCCCC",
    paddingTop: 2,
  },
  seeMoreIcon: {
    position: 'absolute',
    right: 10,
    top: 15,
  },
  addItemRow: {
    paddingHorizontal: 12,
    paddingTop: 4,
    backgroundColor: "white",
  },
});

export {
  ThreadSettingsSeeMore,
  ThreadSettingsAddMember,
  ThreadSettingsAddChildThread,
};
