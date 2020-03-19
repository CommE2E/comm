// @flow

import * as React from 'react';
import { StyleSheet } from 'react-native';
import hoistNonReactStatics from 'hoist-non-react-statics';

import ChatNavigator from './chat-navigator.react';
import KeyboardAvoidingView from '../keyboard/keyboard-avoiding-view.react';
import MessageStorePruner from './message-store-pruner.react';

class Chat extends React.PureComponent<{ ... }> {
  render() {
    return (
      <KeyboardAvoidingView style={styles.keyboardAvoidingView}>
        <ChatNavigator {...this.props} />
        <MessageStorePruner />
      </KeyboardAvoidingView>
    );
  }
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
});

hoistNonReactStatics(Chat, ChatNavigator);

export default Chat;
