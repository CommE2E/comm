// @flow

import * as React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import CommIcon from '../components/comm-icon.react.js';
import { useColors, useStyles } from '../themes/colors.js';

type EnumSettingsOptionProps = {
  +icon?: string,
  +name: string,
  +description: string,
  +enumValue: boolean,
  +onEnumValuePress: () => mixed,
};

function EnumSettingsOption(props: EnumSettingsOptionProps): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const enumIcon = React.useMemo(() => {
    if (!props.icon) {
      return null;
    }

    return (
      <View style={styles.enumIcon}>
        <CommIcon name="megaphone" size={24} color={colors.purpleButton} />
      </View>
    );
  }, [props.icon, styles.enumIcon, colors.purpleButton]);

  let checkBoxFill;
  if (props.enumValue === true) {
    checkBoxFill = <View style={styles.enumCheckBoxFill} />;
  }

  const infoContainerStyle = React.useMemo(() => {
    if (props.icon) {
      return styles.enumInfoContainer;
    }

    return {
      ...styles.enumInfoContainer,
      marginLeft: 30,
    };
  }, [props.icon, styles.enumInfoContainer]);

  return (
    <View style={styles.enumCell}>
      {enumIcon}
      <View style={infoContainerStyle}>
        <Text style={styles.enumInfoName}>{props.name}</Text>
        <Text style={styles.enumInfoDescription}>{props.description}</Text>
      </View>
      <TouchableOpacity
        onPress={props.onEnumValuePress}
        style={styles.enumCheckBoxContainer}
        activeOpacity={0.4}
      >
        <View style={styles.enumCheckBox}>{checkBoxFill}</View>
      </TouchableOpacity>
    </View>
  );
}

const unboundStyles = {
  enumCell: {
    flexDirection: 'row',
    height: 96,
    backgroundColor: 'panelForeground',
  },
  enumIcon: {
    padding: 16,
  },
  enumInfoContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-evenly',
    padding: 8,
  },
  enumInfoName: {
    color: 'panelForegroundLabel',
    fontSize: 18,
    lineHeight: 24,
  },
  enumInfoDescription: {
    color: 'panelForegroundSecondaryLabel',
    lineHeight: 18,
  },
  enumCheckBoxContainer: {
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enumCheckBox: {
    height: 32,
    width: 32,
    borderRadius: 3.5,
    borderWidth: 1,
    borderColor: 'panelSecondaryForegroundBorder',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enumCheckBoxFill: {
    height: 20,
    width: 20,
    borderRadius: 2.1875,
    backgroundColor: 'panelForegroundSecondaryLabel',
  },
};

export default EnumSettingsOption;
