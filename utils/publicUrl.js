const os = require("os");

function getLocalIpv4Address() {
  if (process.env.LAN_IP) {
    return process.env.LAN_IP.trim();
  }

  const interfaces = os.networkInterfaces();

  for (const network of Object.values(interfaces)) {
    if (!network) {
      continue;
    }

    for (const address of network) {
      if (address.family === "IPv4" && !address.internal) {
        return address.address;
      }
    }
  }

  return null;
}

function normalizeLoopbackHostname(hostname) {
  const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1"]);

  if (!loopbackHosts.has(hostname)) {
    return hostname;
  }

  return getLocalIpv4Address() || hostname;
}

function getRequestProtocol(req) {
  return (req.headers["x-forwarded-proto"] || req.protocol || "http")
    .split(",")[0]
    .trim();
}

function getRequestHost(req) {
  return (req.headers["x-forwarded-host"] || req.get("host") || "")
    .split(",")[0]
    .trim();
}

function buildPublicBaseUrl(req) {
  if (process.env.LAN_PUBLIC_URL) {
    return process.env.LAN_PUBLIC_URL.trim().replace(/\/$/, "");
  }

  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL.trim().replace(/\/$/, "");
  }

  const protocol = getRequestProtocol(req);
  const requestHost = getRequestHost(req);

  if (!requestHost) {
    return "";
  }

  const parsedHost = requestHost.startsWith("[")
    ? requestHost.match(/^\[(.+)\](?::(\d+))?$/)
    : requestHost.match(/^([^:]+)(?::(\d+))?$/);

  if (!parsedHost) {
    return `${protocol}://${requestHost}`;
  }

  const hostname = normalizeLoopbackHostname(parsedHost[1]);
  const port = parsedHost[2] ? `:${parsedHost[2]}` : "";

  return `${protocol}://${hostname}${port}`;
}

module.exports = {
  buildPublicBaseUrl,
  getLocalIpv4Address
};
