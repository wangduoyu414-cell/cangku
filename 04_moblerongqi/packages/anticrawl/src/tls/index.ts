// TLS / JA4 fingerprinting helpers

export interface JA4Profile {
  version: string;
  tlsVersion: string;
  cipherSuites: string;
  extensions: string;
  signatureAlgorithms: string;
}

// Representative JA4 profile for a modern mobile Chromium browser.
// Used to build fingerprints and match server-side detection.
export function getJA4Fingerprint(): JA4Profile {
  return {
    version: 't13d1518h2',
    tlsVersion: '0304',
    cipherSuites:
      '1301,1302,1303,c02c,c02b,c02f,cca9,cca8,9d,9c,35,2f',
    extensions:
      '0017,0014,0005,000a,000b,002d,002b,0301,d775,ff01,000d,0012,000f',
    signatureAlgorithms:
      '0401,0501,0201,0403,0503,0203,0202',
  };
}

// Chromium launch arguments that help the browser match a common mobile TLS profile.
// --ignore-certificate-errors is only safe in dev/test environments.
export function applyTLSBypassArgs(): string[] {
  return [
    '--cipher-suites=TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384',
    '--use-first-certificate-for-match',
    '--ignore-certificate-errors',
    '--ignore-certificate-errors-spki-list=*',
  ];
}
