// @flow

import * as React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import CommIcon from '../components/comm-icon.react.js';
import { useColors, useStyles } from '../themes/colors.js';

type InputType = 'radio' | 'checkbox';

type EnumSettingsOptionProps = {
  +icon?: string | React.Node,
  +name: string,
  +description: string | React.Node,
  +enumValue: boolean,
  +onEnumValuePress: () => mixed,
  +type?: InputType,
};

function EnumSettingsOption(props: EnumSettingsOptionProps): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();
  const {
    icon,
    name,
    description,
    enumValue,
    onEnumValuePress,
    type = 'radio',
  } = props;

  const enumIcon = React.useMemo(() => {
    if (!icon) {
      return null;
    }

    if (typeof icon === 'string') {
      return (
        <View style={styles.enumIcon}>
          <CommIcon name={icon} size={24} color={colors.purpleButton} />
        </View>
      );
    }

    return icon;
  }, [icon, styles.enumIcon, colors.purpleButton]);

  const infoContainerStyle = React.useMemo(
    () =>
      props.icon
        ? styles.enumInfoContainer
        : { ...styles.enumInfoContainer, marginLeft: 10 },
    [props.icon, styles.enumInfoContainer],
  );

  const enumInputStyles = React.useMemo(() => {
    const style = [styles.enumInput];

    if (type === 'radio') {
      style.push(styles.radio);
    } else {
      style.push(styles.checkBox);
    }

    return style;
  }, [styles.checkBox, styles.enumInput, styles.radio, type]);

  const enumInputFilledStyles = React.useMemo(() => {
    const style = [styles.enumInputFill];

    if (type === 'radio') {
      style.push(styles.radioFill);
    } else {
      style.push(styles.checkBoxFill);
    }

    return style;
  }, [styles.checkBoxFill, styles.enumInputFill, styles.radioFill, type]);

  const enumInputFill = React.useMemo(
    () => (enumValue ? <View style={enumInputFilledStyles} /> : null),
    [enumValue, enumInputFilledStyles],
  );

  const descriptionElement = React.useMemo(() => {
    if (typeof description === 'string') {
      return <Text style={styles.enumInfoDescription}>{description}</Text>;
    }

    return description;
  }, [description, styles.enumInfoDescription]);

  return (
    <View style={styles.enumCell}>
      {enumIcon}
      <View style={infoContainerStyle}>
        <Text style={styles.enumInfoName}>{name}</Text>
        {descriptionElement}
      </View>
      <TouchableOpacity
        onPress={onEnumValuePress}
        style={styles.enumInputContainer}
        activeOpacity={0.4}
      >
        <View style={enumInputStyles}>{enumInputFill}</View>
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
    marginTop: 8,
  },
  enumInputContainer: {
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enumInput: {
    height: 32,
    width: 32,
    borderWidth: 1,
    borderColor: 'panelSecondaryForegroundBorder',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBox: {
    borderRadius: 3.5,
  },
  radio: {
    borderRadius: 16,
  },
  enumInputFill: {
    height: 20,
    width: 20,
    backgroundColor: 'panelForegroundSecondaryLabel',
  },
  checkBoxFill: {
    borderRadius: 2.1875,
  },
  radioFill: {
    borderRadius: 10,
  },
};

export default EnumSettingsOption;
