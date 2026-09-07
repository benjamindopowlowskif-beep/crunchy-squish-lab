// Optional installation helper for machines whose system DNS cannot resolve npm.
// Only this Node process is affected. HTTPS certificate checks stay enabled.
const dns = require('node:dns');
const original = dns.lookup;
const resolver = new dns.Resolver();
resolver.setServers(['1.1.1.1', '8.8.8.8']);
dns.lookup = function (hostname, options, callback) {
  if (hostname !== 'registry.npmjs.org') return original.apply(this, arguments);
  if (typeof options === 'function') { callback = options; options = {}; }
  resolver.resolve4(hostname, (error, addresses) => {
    if (error) return callback(error);
    if (options?.all) callback(null, addresses.map(address => ({ address, family: 4 })));
    else callback(null, addresses[0], 4);
  });
};
