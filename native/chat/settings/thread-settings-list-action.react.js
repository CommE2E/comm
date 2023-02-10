// @flow

import type { IoniconsGlyphs } from '@expo/vector-icons';
import Icon from '@expo/vector-icons/Ionicons.js';
import * as React from 'react';
import { View, Text, Platform } from 'react-native';

import Button from '../../components/button.react.js';
import { useStyles } from '../../themes/colors.js';
import type { ViewStyle, TextStyle } from '../../types/styles.js';

type ListActionProps = {
  +onPress: () => void,
  +text: string,
  +iconName: IoniconsGlyphs,
  +iconSize: number,
  +iconStyle?: TextStyle,
  +buttonStyle?: ViewStyle,
  +styles: typeof unboundStyles,
};
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

type SeeMoreProps = {
  +onPress: () => void,
};
function ThreadSettingsSeeMore(props: SeeMoreProps): React.Node {
  const styles = useStyles(unboundStyles);
  return (
    <View style={styles.seeMoreRow}>
      <View style={styles.seeMoreContents}>
        <ThreadSettingsListAction
          onPress={props.onPress}
          text="See more..."
          iconName="ellipsis-horizontal"
          iconSize={24}
          iconStyle={styles.seeMoreIcon}
          buttonStyle={styles.seeMoreButton}
          styles={styles}
        />
      </View>
    </View>
  );
}

type AddMemberProps = {
  +onPress: () => void,
};
function ThreadSettingsAddMember(props: AddMemberProps): React.Node {
  const styles = useStyles(unboundStyles);
  return (
    <View style={styles.addItemRow}>
      <ThreadSettingsListAction
        onPress={props.onPress}
        text="Add users"
        iconName="md-add"
        iconStyle={styles.addIcon}
        iconSize={20}
        buttonStyle={styles.addMemberButton}
        styles={styles}
      />
    </View>
  );
}

type AddChildChannelProps = {
  +onPress: () => void,
};
function ThreadSettingsAddSubchannel(props: AddChildChannelProps): React.Node {
  const styles = useStyles(unboundStyles);
  return (
    <View style={styles.addItemRow}>
      <ThreadSettingsListAction
        onPress={props.onPress}
        text="Add subchannel"
        iconName="md-add"
        iconStyle={styles.addIcon}
        iconSize={20}
        buttonStyle={styles.addSubchannelButton}
        styles={styles}
      />
    </View>
  );
}

const unboundStyles = {
  addSubchannelButton: {
    paddingTop: Platform.OS === 'ios' ? 4 : 1,
  },
  addIcon: {
    color: 'link',
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
    top: Platform.OS === 'android' ? 12 : 10,
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

export {
  ThreadSettingsSeeMore,
  ThreadSettingsAddMember,
  ThreadSettingsAddSubchannel,
};
