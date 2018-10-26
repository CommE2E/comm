// @flow

// Sometimes the connection can just go "away", without the client knowing it.
// To detect this happening, the client hits the server with a "ping" every
// three seconds when there hasn't been any other communication.
export const pingFrequency = 3000; // in milliseconds

// If a request doesn't get a response within three seconds, that means our
// connection is questionable. We won't close and reopen the socket yet, but we
// will visually indicate to the user that their connection doesn't seem to be
// working.
export const clientRequestVisualTimeout = 3000; // in milliseconds

// If a request doesn't get a response within five seconds, we assume our socket
// is dead. It's possible this happened because of some weird shit on the server
// side, so we try to close and reopen the socket in the hopes that it will fix
// the problem. Of course, this is rather unlikely, as the connectivity issue is
// likely on the client side.
export const clientRequestSocketTimeout = 5000; // in milliseconds

// The server expects to get a request at least every three seconds from the
// client. If it doesn't get a request within a fifteen second window, it will
// close the connection.
export const serverRequestSocketTimeout = 15000; // in milliseconds
