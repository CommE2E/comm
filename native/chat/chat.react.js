// @flow

import * as React from 'react';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { StyleSheet } from 'react-native';

import ChatNavigator from './chat-navigator.react';
import KeyboardAvoidingView from '../components/keyboard-avoiding-view.react';
import MessageStorePruner from './message-store-pruner.react';

type Props = {|
|};
class Chat extends React.PureComponent<Props> {

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
