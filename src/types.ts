
import {
    DnaHash,
    AgentPubKey,
}					from '@spartan-hc/holo-hash';


export type DnaBundle = {
    manifest: any,
    resources: any,
};

export type HashLocation = { hash: DnaHash };
export type PathLocation = { path: string };
export type BundleLocation = { bundle: DnaBundle };

export type Location = HashLocation | PathLocation | BundleLocation;
export type LocationValue = Uint8Array | string | DnaBundle;


export type RegisterDnaInput = {
    modifiers?: {
	network_seed?: string | null;
	properties?: any | null;
    };
} & Location;
