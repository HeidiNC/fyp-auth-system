function isPrivateHostname(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function getApiBase() {
  const { protocol, hostname, port, origin } = window.location;

  if (protocol !== "http:" && protocol !== "https:") {
    return "http://localhost:3000";
  }

  const isLocalStaticServer =
    isPrivateHostname(hostname) && port && port !== "3000";

  if (isLocalStaticServer) {
    return `${protocol}//${hostname}:3000`;
  }

  return origin;
}

const API_BASE = getApiBase();

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

function buildVerifyUrl(payload) {
  return `${API_BASE}/verify.html?payload=${encodeURIComponent(payload)}`;
}
