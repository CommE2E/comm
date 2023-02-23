// @flow

import type { MessageReactionInfo } from '../selectors/chat-selectors.js';
import { stringForReactionList } from './reaction-utils.js';

describe(
  'stringForReactionList(' +
    'reactions: $ReadOnlyMap<string, MessageReactionInfo>)',
  () => {
    it(
      'should return (👍 3) for a message with three user likes' +
        ' including the viewer',
      () => {
        const messageLikesUsers = [
          { id: '83810', isViewer: true, username: 'ginsu' },
          { id: '86622', isViewer: false, username: 'ashoat' },
          { id: '83889', isViewer: false, username: 'atul' },
        ];
        const messageLikesInfo = {
          users: messageLikesUsers,
          viewerReacted: true,
        };

        const reactionsMap = new Map<string, MessageReactionInfo>();
        reactionsMap.set('👍', messageLikesInfo);

        const reactions = Object.fromEntries(reactionsMap);

        expect(stringForReactionList(reactions)).toBe('👍 3');
      },
    );

    it(
      'should return (👍 3) for a message with three user likes' +
        ' not including the viewer',
      () => {
        const messageLikesUsers = [
          { id: '83810', isViewer: false, username: 'ginsu' },
          { id: '86622', isViewer: false, username: 'ashoat' },
          { id: '83889', isViewer: false, username: 'atul' },
        ];
        const messageLikesInfo = {
          users: messageLikesUsers,
          viewerReacted: false,
        };

        const reactionsMap = new Map<string, MessageReactionInfo>();
        reactionsMap.set('👍', messageLikesInfo);

        const reactions = Object.fromEntries(reactionsMap);

        expect(stringForReactionList(reactions)).toBe('👍 3');
      },
    );

    it(
      'should return (👍) for a message with one user like' +
        ' including the viewer',
      () => {
        const messageLikesUsers = [
          { id: '83810', isViewer: false, username: 'ginsu' },
        ];
        const messageLikesInfo = {
          users: messageLikesUsers,
          viewerReacted: true,
        };

        const reactionsMap = new Map<string, MessageReactionInfo>();
        reactionsMap.set('👍', messageLikesInfo);

        const reactions = Object.fromEntries(reactionsMap);

        expect(stringForReactionList(reactions)).toBe('👍');
      },
    );

    it(
      'should return (👍) for a message with one user like' +
        ' not including the viewer',
      () => {
        const messageLikesUsers = [
          { id: '83810', isViewer: false, username: 'ashoat' },
        ];
        const messageLikesInfo = {
          users: messageLikesUsers,
          viewerReacted: false,
        };

        const reactionsMap = new Map<string, MessageReactionInfo>();
        reactionsMap.set('👍', messageLikesInfo);

        const reactions = Object.fromEntries(reactionsMap);

        expect(stringForReactionList(reactions)).toBe('👍');
      },
    );

    it('should return an empty string for a message no reactions', () => {
      const reactionsMap = new Map<string, MessageReactionInfo>();

      const reactions = Object.fromEntries(reactionsMap);

      expect(stringForReactionList(reactions)).toBe('');
    });

    it(
      'should return (👍 😆 3) for a message with one like not including' +
        ' the viewer and three laugh reactions including the viewer',
      () => {
        const messageLikesUsers = [
          { id: '83810', isViewer: false, username: 'varun' },
        ];
        const messageLikesInfo = {
          users: messageLikesUsers,
          viewerReacted: false,
        };

        const messageLaughsUsers = [
          { id: '12345', isViewer: true, username: 'ginsu' },
          { id: '67890', isViewer: false, username: 'ashoat' },
          { id: '83889', isViewer: false, username: 'atul' },
        ];
        const messageLaughsInfo = {
          users: messageLaughsUsers,
          viewerReacted: true,
        };

        const reactionsMap = new Map<string, MessageReactionInfo>();
        reactionsMap.set('👍', messageLikesInfo);
        reactionsMap.set('😆', messageLaughsInfo);

        const reactions = Object.fromEntries(reactionsMap);

        expect(stringForReactionList(reactions)).toBe('👍 😆 3');
      },
    );

    it(
      'should return (👍 9+) for a message with 12 user likes' +
        ' not including the viewer',
      () => {
        const messageLikesUsers = [
          { id: '86622', isViewer: false, username: 'ginsu' },
          { id: '12345', isViewer: false, username: 'ashoat' },
          { id: '67890', isViewer: false, username: 'atul' },
          { id: '83889', isViewer: false, username: 'varun' },
          { id: '49203', isViewer: false, username: 'tomek' },
          { id: '83029', isViewer: false, username: 'max' },
          { id: '72902', isViewer: false, username: 'jon' },
          { id: '49022', isViewer: false, username: 'mark' },
          { id: '48902', isViewer: false, username: 'kamil' },
          { id: '80922', isViewer: false, username: 'marcin' },
          { id: '12890', isViewer: false, username: 'inka' },
          { id: '67891', isViewer: false, username: 'przemek' },
        ];
        const messageLikesInfo = {
          users: messageLikesUsers,
          viewerReacted: false,
        };

        const reactionsMap = new Map<string, MessageReactionInfo>();
        reactionsMap.set('👍', messageLikesInfo);

        const reactions = Object.fromEntries(reactionsMap);

        expect(stringForReactionList(reactions)).toBe('👍 9+');
      },
    );
  },
);
