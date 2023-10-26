(function () {
  'use strict';

  /* ------------------- FILENAMES ------------------- */
  const loadMessagePlaceholder = '"DEVELOPMENT build with simple auto-reloader\n[2023-10-26 16:42:45] waiting for changes..."';

  /* eslint-env browser */

  const delay = (ms) =>
    new Promise((resolve) => setTimeout(() => resolve(), ms));

  // Log load message to browser dev console
  console.log(loadMessagePlaceholder.slice(1, -1));

  const { name } = chrome.runtime.getManifest();

  connect().then(reload).catch(console.error);

  async function reload() {
    console.log(`${name} has reloaded...`);

    await delay(500);

    return location.reload()
  }

  async function connect() {
    // If the background was reloaded manually,
    //  need to delay for context invalidation
    await delay(100);

    let port;
    try {
      // This will throw if bg was reloaded manually
      port = chrome.runtime.connect({
        name: 'simpleReloader',
      });
    } catch (error) {
      return // should reload, context invalid
    }

    const shouldReload = await Promise.race([
      // get a new port every 5 minutes
      delay(5 * 59 * 1000).then(() => false),
      // or if the background disconnects
      new Promise((r) =>
        port.onDisconnect.addListener(r),
      ).then(() => false),
      // unless we get a reload message
      new Promise((r) => port.onMessage.addListener(r)).then(
        ({ type }) => type === 'reload',
      ),
    ]);

    // Clean up old port
    port.disconnect();

    if (shouldReload) return

    return connect()
  }

})();
