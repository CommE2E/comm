// @flow

import { stringForReactionList } from './reaction-utils.js';
import type { ReactionInfo } from '../selectors/chat-selectors.js';

describe('stringForReactionList(reactions: ReactionInfo)', () => {
  it(
    'should return (👍 3) for a message with three user likes' +
      ' including the viewer',
    () => {
      const messageLikesUsers = [
        { id: '83810', isViewer: true, username: 'ginsu', avatar: null },
        { id: '86622', isViewer: false, username: 'ashoat', avatar: null },
        { id: '83889', isViewer: false, username: 'atul', avatar: null },
      ];
      const messageLikesInfo = {
        users: messageLikesUsers,
        viewerReacted: true,
      };

      const reactions: ReactionInfo = {
        '👍': messageLikesInfo,
      };

      expect(stringForReactionList(reactions)).toBe('👍 3');
    },
  );

  it(
    'should return (👍 3) for a message with three user likes' +
      ' not including the viewer',
    () => {
      const messageLikesUsers = [
        { id: '83810', isViewer: false, username: 'ginsu', avatar: null },
        { id: '86622', isViewer: false, username: 'ashoat', avatar: null },
        { id: '83889', isViewer: false, username: 'atul', avatar: null },
      ];
      const messageLikesInfo = {
        users: messageLikesUsers,
        viewerReacted: false,
      };

      const reactions: ReactionInfo = {
        '👍': messageLikesInfo,
      };

      expect(stringForReactionList(reactions)).toBe('👍 3');
    },
  );

  it(
    'should return (👍) for a message with one user like' +
      ' including the viewer',
    () => {
      const messageLikesUsers = [
        { id: '83810', isViewer: false, username: 'ginsu', avatar: null },
      ];
      const messageLikesInfo = {
        users: messageLikesUsers,
        viewerReacted: true,
      };

      const reactions: ReactionInfo = {
        '👍': messageLikesInfo,
      };

      expect(stringForReactionList(reactions)).toBe('👍');
    },
  );

  it(
    'should return (👍) for a message with one user like' +
      ' not including the viewer',
    () => {
      const messageLikesUsers = [
        { id: '83810', isViewer: false, username: 'ashoat', avatar: null },
      ];
      const messageLikesInfo = {
        users: messageLikesUsers,
        viewerReacted: false,
      };

      const reactions: ReactionInfo = {
        '👍': messageLikesInfo,
      };

      expect(stringForReactionList(reactions)).toBe('👍');
    },
  );

  it('should return an empty string for a message no reactions', () => {
    const reactions: ReactionInfo = {};

    expect(stringForReactionList(reactions)).toBe('');
  });

  it(
    'should return (👍 😆 3) for a message with one like not including' +
      ' the viewer and three laugh reactions including the viewer',
    () => {
      const messageLikesUsers = [
        { id: '83810', isViewer: false, username: 'varun', avatar: null },
      ];
      const messageLikesInfo = {
        users: messageLikesUsers,
        viewerReacted: false,
      };

      const messageLaughsUsers = [
        { id: '12345', isViewer: true, username: 'ginsu', avatar: null },
        { id: '67890', isViewer: false, username: 'ashoat', avatar: null },
        { id: '83889', isViewer: false, username: 'atul', avatar: null },
      ];
      const messageLaughsInfo = {
        users: messageLaughsUsers,
        viewerReacted: true,
      };

      const reactions: ReactionInfo = {
        '👍': messageLikesInfo,
        '😆': messageLaughsInfo,
      };

      expect(stringForReactionList(reactions)).toBe('👍 😆 3');
    },
  );

  it(
    'should return (👍 9+) for a message with 12 user likes' +
      ' not including the viewer',
    () => {
      const messageLikesUsers = [
        { id: '86622', isViewer: false, username: 'ginsu', avatar: null },
        { id: '12345', isViewer: false, username: 'ashoat', avatar: null },
        { id: '67890', isViewer: false, username: 'atul', avatar: null },
        { id: '83889', isViewer: false, username: 'varun', avatar: null },
        { id: '49203', isViewer: false, username: 'tomek', avatar: null },
        { id: '83029', isViewer: false, username: 'max', avatar: null },
        { id: '72902', isViewer: false, username: 'jon', avatar: null },
        { id: '49022', isViewer: false, username: 'mark', avatar: null },
        { id: '48902', isViewer: false, username: 'kamil', avatar: null },
        { id: '80922', isViewer: false, username: 'marcin', avatar: null },
        { id: '12890', isViewer: false, username: 'inka', avatar: null },
        { id: '67891', isViewer: false, username: 'przemek', avatar: null },
      ];
      const messageLikesInfo = {
        users: messageLikesUsers,
        viewerReacted: false,
      };

      const reactions: ReactionInfo = {
        '👍': messageLikesInfo,
      };

      expect(stringForReactionList(reactions)).toBe('👍 9+');
    },
  );
});
