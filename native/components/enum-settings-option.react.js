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
  +disabled?: boolean,
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
    disabled,
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

  const descriptionElement = React.useMemo(() => {
    if (typeof description === 'string') {
      return <Text style={styles.enumInfoDescription}>{description}</Text>;
    }

    return description;
  }, [description, styles.enumInfoDescription]);

  const enumInputStyles = React.useMemo(() => {
    const style: Array<$Values<typeof styles>> = [styles.enumInput];

    if (disabled) {
      style.push(styles.disabled);
    } else if (type === 'radio') {
      style.push(styles.radio);
    } else {
      style.push(styles.checkBox);
    }

    return style;
  }, [disabled, styles, type]);

  const enumInputFilledStyles = React.useMemo(() => {
    const style: Array<$Values<typeof styles>> = [styles.enumInputFill];

    if (type === 'radio') {
      style.push(styles.radioFill);
    } else {
      style.push(styles.checkBoxFill);
    }

    return style;
  }, [styles, type]);

  const enumInputFill = React.useMemo(
    () => (enumValue ? <View style={enumInputFilledStyles} /> : null),
    [enumValue, enumInputFilledStyles],
  );

  const touchableContainerStyle = React.useMemo(() => {
    const style: Array<$Values<typeof styles>> = [styles.touchableContainer];

    if (enumValue) {
      style.push(styles.touchableContainerSelected);
    }

    return style;
  }, [enumValue, styles]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={touchableContainerStyle}
        activeOpacity={0.4}
        onPress={onEnumValuePress}
        disabled={disabled}
      >
        {enumIcon}
        <View style={styles.enumInfoContainer}>
          <Text style={styles.enumInfoName}>{name}</Text>
          {descriptionElement}
        </View>
        <View style={styles.enumInputContainer}>
          <View style={enumInputStyles}>{enumInputFill}</View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const unboundStyles = {
  container: {
    backgroundColor: 'panelForeground',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  touchableContainer: {
    flexDirection: 'row',
    padding: 12,
  },
  touchableContainerSelected: {
    backgroundColor: 'panelSecondaryForeground',
    borderRadius: 8,
  },
  enumIcon: {
    paddingTop: 4,
    paddingRight: 24,
  },
  enumInfoContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-evenly',
  },
  enumInfoName: {
    color: 'panelForegroundLabel',
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 4,
  },
  enumInfoDescription: {
    color: 'panelForegroundSecondaryLabel',
    lineHeight: 18,
  },
  enumInputContainer: {
    padding: 16,
    paddingRight: 0,
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
  disabled: {
    opacity: 0,
  },
};

export default EnumSettingsOption;
