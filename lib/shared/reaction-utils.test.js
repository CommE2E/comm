// @flow

import type { MessageReactionInfo } from '../selectors/chat-selectors';
import { stringForReactionList } from './reaction-utils';

describe(
  'stringForReactionList(' +
    'reactions: $ReadOnlyMap<string, MessageReactionInfo>)',
  () => {
    it(
      'should return (👍 3) for a message with three user likes' +
        ' including the viewer',
      () => {
        const messageLikesUsers = ['83810', '86622', '83889'];
        const messageLikesUsersSet = new Set(messageLikesUsers);
        const messageLikesInfo = {
          users: messageLikesUsersSet,
          viewerReacted: true,
        };

        const reactionsMap = new Map<string, MessageReactionInfo>();
        reactionsMap.set('👍', messageLikesInfo);

        expect(stringForReactionList(reactionsMap)).toBe('👍 3');
      },
    );

    it(
      'should return (👍 3) for a message with three user likes' +
        ' not including the viewer',
      () => {
        const messageLikesUsers = ['83810', '86622', '83889'];
        const messageLikesUsersSet = new Set(messageLikesUsers);
        const messageLikesInfo = {
          users: messageLikesUsersSet,
          viewerReacted: false,
        };

        const reactionsMap = new Map<string, MessageReactionInfo>();
        reactionsMap.set('👍', messageLikesInfo);

        expect(stringForReactionList(reactionsMap)).toBe('👍 3');
      },
    );

    it(
      'should return (👍) for a message with one user like' +
        ' including the viewer',
      () => {
        const messageLikesUsers = ['83810'];
        const messageLikesUsersSet = new Set(messageLikesUsers);
        const messageLikesInfo = {
          users: messageLikesUsersSet,
          viewerReacted: true,
        };

        const reactionsMap = new Map<string, MessageReactionInfo>();
        reactionsMap.set('👍', messageLikesInfo);

        expect(stringForReactionList(reactionsMap)).toBe('👍');
      },
    );

    it(
      'should return (👍) for a message with one user like' +
        ' not including the viewer',
      () => {
        const messageLikesUsers = ['86622'];
        const messageLikesUsersSet = new Set(messageLikesUsers);
        const messageLikesInfo = {
          users: messageLikesUsersSet,
          viewerReacted: false,
        };

        const reactionsMap = new Map<string, MessageReactionInfo>();
        reactionsMap.set('👍', messageLikesInfo);

        expect(stringForReactionList(reactionsMap)).toBe('👍');
      },
    );

    it('should return an empty string for a message no reactions', () => {
      const reactionsMap = new Map<string, MessageReactionInfo>();

      expect(stringForReactionList(reactionsMap)).toBe('');
    });

    it(
      'should return (👍 😆 3) for a message with one like not including' +
        ' the viewer and three laugh reactions including the viewer',
      () => {
        const messageLikesUsers = ['86622'];
        const messageLikesUsersSet = new Set(messageLikesUsers);
        const messageLikesInfo = {
          users: messageLikesUsersSet,
          viewerReacted: false,
        };

        const messageLaughsUsers = ['12345', '67890', '83889'];
        const messageLaughsUsersSet = new Set(messageLaughsUsers);
        const messageLaughsInfo = {
          users: messageLaughsUsersSet,
          viewerReacted: true,
        };

        const reactionsMap = new Map<string, MessageReactionInfo>();
        reactionsMap.set('👍', messageLikesInfo);
        reactionsMap.set('😆', messageLaughsInfo);

        expect(stringForReactionList(reactionsMap)).toBe('👍 😆 3');
      },
    );
  },
);
