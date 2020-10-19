// @flow

import type { ViewStyle, TextStyle } from '../../types/styles';
import type { IoniconsGlyphs } from 'react-native-vector-icons/Ionicons';
import type { AppState } from '../../redux/redux-setup';

import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { connect } from 'lib/utils/redux-utils';

import Button from '../../components/button.react';
import { styleSelector } from '../../themes/colors';

type ListActionProps = {|
  onPress: () => void,
  text: string,
  iconName: IoniconsGlyphs,
  iconSize: number,
  iconStyle?: TextStyle,
  buttonStyle?: ViewStyle,
  styles: typeof styles,
|};
function ThreadSettingsListAction(props: ListActionProps) {
  return (
    <Button onPress={props.onPress} style={props.buttonStyle}>
      <View style={props.styles.container}>
        <Text style={props.styles.text}>{props.text}</Text>
        <Icon
          name={props.iconName}
          size={props.iconSize}
          style={[props.styles.icon, props.iconStyle]}
        />
      </View>
    </Button>
  );
}

type SeeMoreProps = {|
  onPress: () => void,
  // Redux state
  styles: typeof styles,
|};
function ThreadSettingsSeeMore(props: SeeMoreProps) {
  return (
    <View style={props.styles.seeMoreRow}>
      <View style={props.styles.seeMoreContents}>
        <ThreadSettingsListAction
          onPress={props.onPress}
          text="See more..."
          iconName="ios-more"
          iconSize={36}
          iconStyle={props.styles.seeMoreIcon}
          buttonStyle={props.styles.seeMoreButton}
          styles={props.styles}
        />
      </View>
    </View>
  );
}

type AddMemberProps = {|
  onPress: () => void,
  // Redux state
  styles: typeof styles,
|};
function ThreadSettingsAddMember(props: AddMemberProps) {
  return (
    <View style={props.styles.addItemRow}>
      <ThreadSettingsListAction
        onPress={props.onPress}
        text="Add users"
        iconName="md-add"
        iconStyle={props.styles.addIcon}
        iconSize={20}
        buttonStyle={props.styles.addMemberButton}
        styles={props.styles}
      />
    </View>
  );
}

type AddChildThreadProps = {|
  onPress: () => void,
  // Redux state
  styles: typeof styles,
|};
function ThreadSettingsAddSubthread(props: AddChildThreadProps) {
  return (
    <View style={props.styles.addItemRow}>
      <ThreadSettingsListAction
        onPress={props.onPress}
        text="Add subthread"
        iconName="md-add"
        iconStyle={props.styles.addIcon}
        iconSize={20}
        buttonStyle={props.styles.addSubthreadButton}
        styles={props.styles}
      />
    </View>
  );
}

const styles = {
  addSubthreadButton: {
    paddingTop: Platform.OS === 'ios' ? 4 : 1,
  },
  addIcon: {
    color: '#009900',
  },
  addItemRow: {
    backgroundColor: 'panelForeground',
    paddingHorizontal: 12,
  },
  addMemberButton: {
    paddingTop: Platform.OS === 'ios' ? 4 : 1,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  icon: {
    lineHeight: 20,
  },
  seeMoreButton: {
    paddingBottom: Platform.OS === 'ios' ? 4 : 2,
    paddingTop: Platform.OS === 'ios' ? 2 : 0,
  },
  seeMoreContents: {
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
  },
  seeMoreIcon: {
    color: 'link',
    position: 'absolute',
    right: 10,
    top: Platform.OS === 'android' ? 17 : 15,
  },
  seeMoreRow: {
    backgroundColor: 'panelForeground',
    paddingHorizontal: 12,
  },
  text: {
    color: 'link',
    flex: 1,
    fontSize: 16,
    fontStyle: 'italic',
  },
};
const stylesSelector = styleSelector(styles);

const WrappedThreadSettingsSeeMore = connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(ThreadSettingsSeeMore);

const WrappedThreadSettingsAddMember = connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(ThreadSettingsAddMember);

const WrappedThreadSettingsAddSubthread = connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(ThreadSettingsAddSubthread);

export {
  WrappedThreadSettingsSeeMore as ThreadSettingsSeeMore,
  WrappedThreadSettingsAddMember as ThreadSettingsAddMember,
  WrappedThreadSettingsAddSubthread as ThreadSettingsAddSubthread,
};
