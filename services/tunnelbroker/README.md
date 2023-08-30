# Tunnelbroker

Tunnelbroker is a Comm service which provides message delivery to devices. This is useful in many cases such as: X3DH key rotation, device to device messages, and device synchronization.

## How it works

Tunnelbroker works by enqueuing messages to a device. When a device opens a WebSocket connection to Tunnelbroker, the device will send its credentials to Tunnelbroker. Tunnelbroker will then validate the authenticity of the credentials with [Identity service](../identity). After authentication, Tunnelbroker will deliver any undelivered messages to the device. Tunnelbroker will then keep an open WebSocket connection to the device, in which messages may be streamed.

Messages get enqueued by either services or devices which emit messages addressed to another device.

## Service-to-device messages

Messages sent to Tunnelbroker from services use the gRPC protocol, and the messages are found in [tunnelbroker_messages](../../shared/tunnelbroker_messages/src/messages/).

## Device-to-device messages

Messages sent from a device will use the WebSocket protocol. These message types exist in [tunnelbroker-messages.js](../../lib/types/tunnelbroker-messages.js). Tunnelbroker will only deliver messages from authenticated devices.
