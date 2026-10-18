const CA_ERRORS = new Set([
  'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'
]);
const HINTS = {
  ERR_TLS_CERT_ALTNAME_INVALID: 'TLS certificate hostname mismatch. Install a certificate covering the endpoint hostname.',
  CERT_HAS_EXPIRED: 'TLS certificate has expired. Renew the server certificate.',
  CERT_NOT_YET_VALID: 'TLS certificate is not yet valid. Check the certificate dates and system clock.',
  ERR_SSL_WRONG_VERSION_NUMBER: 'HTTPS protocol mismatch. Check the endpoint scheme and HTTPS port.',
  ENOTFOUND: 'DNS lookup failed. Check the endpoint hostname and DNS configuration.',
  EAI_AGAIN: 'DNS lookup temporarily failed. Check DNS connectivity.',
  ECONNREFUSED: 'Connection was refused. Check the endpoint port and whether the server is listening.',
  ETIMEDOUT: 'The network request timed out. Check connectivity and the endpoint port.',
  UND_ERR_CONNECT_TIMEOUT: 'The network connection timed out. Check connectivity and the endpoint port.'
};

function findReason(error) {
  const pending = [error];
  const seen = new Set();
  while (pending.length && seen.size < 16) {
    const current = pending.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    if (CA_ERRORS.has(current.code)) {
      const kind = current.code.includes('SELF_SIGNED') ? 'self-signed certificate is not trusted' : 'certificate issuer is not trusted';
      return `TLS certificate verification failed (${current.code}): ${kind}. Install a trusted certificate, or set NODE_EXTRA_CA_CERTS to a verified CA PEM before starting fnos; the certificate must also match the endpoint hostname.`;
    }
    if (HINTS[current.code]) return `${HINTS[current.code]} (${current.code})`;
    if (current.name === 'TimeoutError') return 'The OAuth request timed out. Check connectivity and the endpoint port.';
    if (current.cause) pending.push(current.cause);
    if (Array.isArray(current.errors)) pending.push(...current.errors);
  }
  return null;
}

/** Explain known transport failures without exposing request bodies, URL secrets or raw causes. */
function describeOAuthTransportError(error, url) {
  const reason = findReason(error);
  if (!reason && error?.message !== 'fetch failed') return error;
  let target = 'the OAuth endpoint';
  try {
    const parsed = new URL(url);
    target = `${parsed.origin}${parsed.pathname}`;
  } catch {}
  const failure = new Error(`OAuth request to ${target} failed: ${reason || 'network request failed; check connectivity and TLS certificate configuration.'}`, { cause: error });
  failure.exitCode = 1;
  return failure;
}

module.exports = { describeOAuthTransportError };
