// @flow

import * as React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SingleLine } from '../components/single-line.react.js';
import type { GlobalTheme } from '../types/themes.js';

const edges = ['top'];

type Props = {
  +title: ?string,
  +message: string,
  +activeTheme: ?GlobalTheme,
};
function InAppNotif(props: Props): React.Node {
  const useLightStyle = Platform.OS === 'ios' && props.activeTheme !== 'dark';

  let title = null;
  const textStyle = [
    styles.text,
    useLightStyle ? styles.lightText : styles.darkText,
  ];

  if (props.title) {
    title = (
      <SingleLine style={[styles.title, ...textStyle]}>
        {props.title}
      </SingleLine>
    );
  }

  const notificationContent = (
    <View style={styles.notificationContent}>
      {title}
      <SingleLine style={textStyle}>{props.message}</SingleLine>
    </View>
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
  notificationContent: {
    ...Platform.select({
      ios: {
        marginTop: 16,
        marginBottom: 6,
      },
      default: {
        marginVertical: 16,
      },
    }),
    marginHorizontal: 10,
  },
  text: {
    ...Platform.select({
      ios: {
        fontSize: 16,
        color: 'black',
      },
      default: {
        fontSize: 18,
      },
    }),
  },
  title: {
    fontWeight: 'bold',
  },
});

export default InAppNotif;
