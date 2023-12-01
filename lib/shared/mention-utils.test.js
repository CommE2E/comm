// @flow

import {
  encodeChatMentionText,
  decodeChatMentionText,
  getRawChatMention,
  renderChatMentionsWithAltText,
} from './mention-utils.js';
import type { ResolvedThreadInfo } from '../types/thread-types.js';

describe('encodeChatMentionText', () => {
  it('should encode closing brackets', () => {
    expect(encodeChatMentionText('[[test]test')).toEqual('[[test\\]test');
    expect(encodeChatMentionText('test]]test')).toEqual('test\\]\\]test');
    expect(encodeChatMentionText('test]')).toEqual('test\\]');
    expect(encodeChatMentionText('test ] ] ]] asd] d]d')).toEqual(
      'test \\] \\] \\]\\] asd\\] d\\]d',
    );
  });
});

describe('decodeChatMentionText', () => {
  it('should decode closing brackets', () => {
    expect(decodeChatMentionText('test\\]')).toEqual('test]');
    expect(decodeChatMentionText('test\\]\\]')).toEqual('test]]');
    expect(decodeChatMentionText('test \\] test')).toEqual('test ] test');
  });
  it('should not decode already decoded closing brackets', () => {
    expect(decodeChatMentionText('test]]')).toEqual('test]]');
    expect(decodeChatMentionText('test]')).toEqual('test]');
    expect(decodeChatMentionText('test ] test')).toEqual('test ] test');
  });
});

describe('getRawChatMention', () => {
  it('should return raw chat mention', () =>
    expect(
      getRawChatMention({
        ...(({}: any): ResolvedThreadInfo),
        id: '256|123',
        uiName: 'thread-name',
      }),
    ).toEqual('@[[256|123:thread-name]]'));

  it('should return raw chat mention with encoded text', () =>
    expect(
      getRawChatMention({
        ...(({}: any): ResolvedThreadInfo),
        id: '256|123',
        uiName: 'thread-]name]]',
      }),
    ).toEqual('@[[256|123:thread-\\]name\\]\\]]]'));
});

describe('renderChatMentionsWithAltText', () => {
  it('should render chat mentions with alternative text', () =>
    expect(
      renderChatMentionsWithAltText(
        'This is a test @[[256|123:thread-name]] @[[256|123:thread-\\]name2\\]\\]]]',
      ),
    ).toEqual('This is a test @thread-name @thread-]name2]]'));
});
