// We do this because we need to render this app on the server, but visibilityjs
// expects the window global to be initialized
if (!process.env.BROWSER) {
  global.window = {};
  global.document = null;
}
