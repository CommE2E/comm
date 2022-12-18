// @flow

import * as React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SingleLine } from '../components/single-line.react';
import type { GlobalTheme } from '../types/themes';

const edges = ['top'];

type Props = {
  +title: ?string,
  +message: string,
  +activeTheme: ?GlobalTheme,
};
function InAppNotif(props: Props): React.Node {
  const useLightStyle = Platform.OS === 'ios' && props.activeTheme !== 'dark';

  let title = null;
  if (props.title) {
    title = (
      <>
        <SingleLine style={styles.title}>{props.title}</SingleLine>
        {'\n'}
      </>
    );
  }

  const textStyles = [
    styles.text,
    useLightStyle ? styles.lightText : styles.darkText,
  ];
  const notificationContent = (
    <Text style={textStyles}>
      {title}
      {props.message}
    </Text>
  );

  if (Platform.OS === 'android') {
    return (
      <SafeAreaView style={styles.notif} edges={edges}>
        {notificationContent}
      </SafeAreaView>
    );
  }

  return <View style={styles.notif}>{notificationContent}</View>;
}

const styles = StyleSheet.create({
  darkText: {
    color: 'black',
  },
  lightText: {
    color: 'white',
  },
  notif: {
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
    width: '100%',
  },
  text: {
    ...Platform.select({
      ios: {
        fontSize: 16,
        marginTop: 16,
        marginBottom: 6,
        color: 'black',
      },
      default: {
        fontSize: 18,
        marginVertical: 16,
      },
    }),
    marginHorizontal: 10,
  },
  title: {
    fontWeight: 'bold',
  },
});

export default InAppNotif;
