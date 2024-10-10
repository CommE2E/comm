// @flow

import t, { type TInterface } from 'tcomb';

import type {
  NeynarWebhookCastCreatedData,
  NeynarWebhookChannel,
  NeynarWebhookCastAuthor,
  NeynarWebhookCastCreatedEvent,
} from '../farcaster-types.js';

export const neynarWebhookCastAuthorValidator: TInterface<NeynarWebhookCastAuthor> =
  t.interface<NeynarWebhookCastAuthor>({
    object: t.enums.of(['user']),
    fid: t.String,
    custody_address: t.String,
    username: t.String,
    display_name: t.String,
    pfp_url: t.String,
  });

export const neynarWebhookChannelValidator: TInterface<NeynarWebhookChannel> =
  t.interface<NeynarWebhookChannel>({
    id: t.String,
    name: t.String,
    image_url: t.String,
  });

export const neynarWebhookCastCreatedDataValidator: TInterface<NeynarWebhookCastCreatedData> =
  t.interface<NeynarWebhookCastCreatedData>({
    object: t.enums.of(['cast']),
    hash: t.String,
    thread_hash: t.String,
    text: t.String,
    channel: t.maybe(neynarWebhookChannelValidator),
    parent_hash: t.maybe(t.String),
  });

export const neynarWebhookCastCreatedEventValidator: TInterface<NeynarWebhookCastCreatedEvent> =
  t.interface<NeynarWebhookCastCreatedEvent>({
    created_at: t.Number,
    type: t.enums.of(['cast.created']),
    data: neynarWebhookCastCreatedDataValidator,
  });
