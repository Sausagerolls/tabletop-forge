// mDNS / Bonjour advertisement.
//
// Goal: let players type `tabletopforge.local:<port>` from their phone
// instead of memorising the GM's LAN IP, and — in a Play-Store-NSC
// world — give Android a `.local` host the network-security-config
// will actually allow over cleartext.
//
// Best-effort by design. Three things can go wrong on startup:
//
//   1. Multicast UDP 5353 can't be bound (Docker Desktop on Mac /
//      Windows won't pass it out of the VM, some hardened Linux
//      kernels block raw multicast for unprivileged users, etc.).
//   2. The user already has another mDNS responder owning the
//      same service name — we drop the second advertisement
//      rather than crash.
//   3. The host process can't write to the loopback interface
//      (extremely rare; corporate-managed devices).
//
// In any of those cases we log a warning and continue with a null
// `mdnsName`, so /api/version + the GM Connection panel can fall
// back to the user's host-side `.local` (macOS: `<host>.local` is
// auto-advertised by mDNSResponder; Windows: same after Bonjour
// Print Services is installed; Linux: avahi-daemon).

const path = require('path');
const os = require('os');

let advertisedName = null;
let advertisedHostname = null;
let bonjour = null;

// One canonical name across machines + builds. The matching short
// hostname (`tabletopforge.local`) is what shows up in the resolver.
const SERVICE_NAME = 'TableTop Forge';
const SERVICE_TYPE = 'http';
const SERVICE_HOSTNAME = 'tabletopforge';

/**
 * Try to advertise the running server over mDNS.
 *
 *   port — TCP port the backend is listening on, advertised in the
 *          SRV record so resolvers know where to connect.
 *
 * Returns an object describing what was advertised:
 *   {
 *     mdnsName:  'tabletopforge.local'  // null if advertise failed
 *     hostName:  'jakes-mac-studio'      // os.hostname(), trimmed
 *     mdnsHost:  'jakes-mac-studio.local' // best-guess host .local
 *   }
 *
 * `mdnsHost` is what we show in the GM panel for Mac / Windows
 * Docker users — even when our own multicast can't escape the VM,
 * the host OS is (or can be) advertising itself, so the GM has a
 * usable `.local` URL by way of the host's own hostname. For users
 * where neither path works (Windows without Bonjour) the panel
 * falls through to the LAN IP.
 */
function startAdvertise(port) {
  // Allow the user / Tauri shell / start.sh to override the host
  // name we surface to the GM panel. Useful when the container's
  // os.hostname() is some random Docker ID and we want the actual
  // Mac / Windows hostname instead.
  const overrideHost = (process.env.EXTERNAL_LOCAL_HOST || '').trim();
  const rawHost = (overrideHost || os.hostname() || '').trim();
  // Strip the trailing `.local` if the env var already included it,
  // so `<x>.local.local` can't happen.
  const cleanHost = rawHost.replace(/\.local\.?$/i, '');
  advertisedHostname = cleanHost;

  try {
    // bonjour-service is ESM-only on newer versions but ships a CJS
    // build alongside. require() lands on the CJS shim.
    const { Bonjour } = require('bonjour-service');
    bonjour = new Bonjour();
    bonjour.publish({
      name: SERVICE_NAME,
      type: SERVICE_TYPE,
      port,
      host: SERVICE_HOSTNAME,         // → tabletopforge.local
      txt: { path: '/' },
    });
    advertisedName = `${SERVICE_HOSTNAME}.local`;
    console.log(`[mdns] advertising ${advertisedName} on port ${port}`);
  } catch (err) {
    advertisedName = null;
    console.warn(
      `[mdns] could not advertise on the LAN: ${err.message}. ` +
      `Players can still reach the server via the host's own .local ` +
      `name (${cleanHost}.local) or by IP.`
    );
  }

  return {
    mdnsName: advertisedName,
    hostName: cleanHost,
    mdnsHost: cleanHost ? `${cleanHost}.local` : null,
  };
}

function stopAdvertise() {
  if (!bonjour) return;
  try { bonjour.unpublishAll(); bonjour.destroy(); }
  catch (err) { console.warn('[mdns] unpublish error:', err.message); }
  bonjour = null;
}

function status() {
  return {
    mdnsName: advertisedName,
    hostName: advertisedHostname,
    mdnsHost: advertisedHostname ? `${advertisedHostname}.local` : null,
  };
}

module.exports = { startAdvertise, stopAdvertise, status };
