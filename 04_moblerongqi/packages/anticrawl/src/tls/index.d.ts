export interface JA4Profile {
    version: string;
    tlsVersion: string;
    cipherSuites: string;
    extensions: string;
    signatureAlgorithms: string;
}
export declare function getJA4Fingerprint(): JA4Profile;
export declare function applyTLSBypassArgs(): string[];
//# sourceMappingURL=index.d.ts.map