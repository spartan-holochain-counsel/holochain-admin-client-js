
import {
    DnaHash,
    WasmHash,
    AgentPubKey,
}					from '@spartan-hc/holo-hash';


export type Option<T> = T | null | undefined;
export interface Duration {
    secs:		number;
    nanos:		number;
};
export type HumanTimestampMicros = number; // unix timestamp in micro seconds
export type HumanTimestampRFC3339 = string;
export type HumanTimestamp = HumanTimestampMicros | HumanTimestampRFC3339;

export type HashLocation = { hash: DnaHash };
export type PathLocation = { path: string };
export type BundleLocation = { bundle: DnaBundle };

export type Location = HashLocation | PathLocation | BundleLocation;
export type LocationValue = Uint8Array | string | DnaBundle;

export type DnaModifiers = {
    network_seed:	string;
    properties:		Uint8Array;
    origin_time:	number;
    quantum_time:	Duration;
};
export type DnaModifiersDecoded = {
    network_seed:	string;
    properties:		any;
    origin_time:	number;
    quantum_time:	Duration;
};

export type CellId = [ DnaHash, AgentPubKey ];
export type CellIdWithContext = {
    app_id:             string | null;
    role_id:            string | null;
    cell_id:            CellId;
};


export type ZomeDependency = {
    name:		string;
};
export type ZomeManifest = {
    name:		string;
    hash?:		string | null;
} & Location;
export type CoordinatorZomeManifest = {
    dependencies?:	Array<ZomeDependency> | null;
} & ZomeManifest;
export type DnaManifestV1 = {
    manifest_version:	string;
    name:		string;
    integrity: {
	network_seed?:	string | null;
	properties?:	any | null;
	origin_time:	HumanTimestamp;
	zomes:		Array<ZomeManifest>,
    },
    coordinator: {
	zomes:		Array<CoordinatorZomeManifest>,
    },
};

export enum CellProvisioningStrategy {
    Create = "create",
    CreateOnly = "create_only",
};
export type CellProvisioningBase = {
    strategy:		CellProvisioningStrategy;
};
export type CellProvisioningCreate = {
    strategy:		"create";
    deferred:		boolean;
} & CellProvisioningBase;
export type CellProvisioningCloneOnly = {
    strategy:		"clone_only";
} & CellProvisioningBase;
export type CellProvisioning = CellProvisioningCreate | CellProvisioningCloneOnly;
export type RoleDnaManifest = {
    modifiers?:		Partial<DnaModifiers> | null;
    installed_hash?:	string | null;
    clone_limit?:	number | null;
} & Location;
export type RoleManifest = {
    name:		string;
    provisioning?:	CellProvisioning | null;
    dna:		RoleDnaManifest;
};
export type HappManifestV1 = {
    manifest_version:	string;
    name:		string;
    description?:	string | null;
    roles:		Array<RoleManifest>,
};

export type Bundle = {
    manifest: any,
    resources: any,
};
export type DnaBundle = {
    manifest: DnaManifestV1,
} & Bundle;
export type HappBundle = {
    manifest: HappManifestV1,
} & Bundle;


export type PausedAppReason = {
    error: string;
};

export type DisabledAppReasonNeverStarted = { never_started: null };
export type DisabledAppReasonUser = { user: null };
export type DisabledAppReasonError = { error: string };
export type DisabledAppReason = DisabledAppReasonNeverStarted | DisabledAppReasonUser | DisabledAppReasonError;

export type AppInfoStatusPaused = {
    paused: {
	reason: PausedAppReason
    };
};
export type AppInfoStatusDisabled = {
    disabled: {
        reason: DisabledAppReason;
    };
};
export type AppInfoStatusRunning = "running";
export type AppInfoStatus = AppInfoStatusPaused | AppInfoStatusDisabled | AppInfoStatusRunning;

export type AllowedOrigins =
    | "*"
    | string
    | Array<string>;
export type AppInterfaceInfo = {
    port		: Number;
    allowed_origins	: AllowedOrigins;
    installed_app_id   ?: string;
};


export interface BaseCell {
    dna_modifiers:	DnaModifiers;
}
export interface ProvisionedCell extends BaseCell {
    cell_id:		CellId;
    // dna_modifiers:	DnaModifiers;
    name:		string;
};
export interface ClonedCell extends ProvisionedCell {
    // cell_id:		CellId;
    clone_id:		string;
    original_dna_hash:	DnaHash;
    // dna_modifiers:	DnaModifiers;
    // name:		string;
    enabled:		boolean;
};
export interface StemCell extends BaseCell {
    dna:		DnaHash;
    name?:		string;
    // dna_modifiers:	DnaModifiers;
};
export type CellInfoData = ProvisionedCell | ClonedCell | StemCell;

export type CellInfoProvisioned = { "provisioned": ProvisionedCell };
export type CellInfoCloned = { "cloned": ClonedCell };
export type CellInfoStem = { "stem": StemCell };
export type CellInfo = CellInfoProvisioned | CellInfoCloned | CellInfoStem;

export type AppInfo = {
    agent_pub_key:	Uint8Array;
    installed_app_id:	string;
    cell_info:		Record<string, Array<CellInfo>>;
    status:		AppInfoStatus;
    manifest:		DnaManifestV1;
};

export type Role = {
    // Maybe provisioned could have the cell ID or be null instead of being a boolean
    provisioned:	boolean;
    cell_id:		CellId | null;
    cloned:		Array<ClonedCell>;
    dna_modifiers:	DnaModifiersDecoded;
};
export type Installation = {
    agent_pub_key:	AgentPubKey;
    installed_app_id:	string;
    manifest:		DnaManifestV1;
    roles:		Record<string, Role>;
    running:		boolean;
    status:		AppInfoStatus;
};


export type CapabilitySecret = string | Uint8Array;
export type CapabilityFunctions = "*" | Array<[string, string]> | Record<string, Array<string>>;


export type RegisterDnaInput = {
    modifiers	       ?: {
	network_seed   ?: string | null;
	properties     ?: any | null;
    };
} & Location;

export type WasmDef = {
    wasm_hash			: WasmHash;
    dependencies		: Array<string>;
    preserialized_path	       ?: string;
};
export type ZomeDef =
    | WasmDef
    | {
	inline_zome		: Uint8Array;
	dependencies		: Array<string>;
    };

export type IntegrityZomes = Array<[ string, ZomeDef ]>;
export type CoordinatorZomes = Array<[ string, ZomeDef ]>;

export type DnaDef = {
    name		: string;
    modifiers		: DnaModifiers;
    integrity_zomes	: IntegrityZomes;
    coordinator_zomes	: CoordinatorZomes;
};

export type InstallAppInput = {
    installed_app_id	: string;
    agent_key		: AgentPubKey;
    membrane_proofs?	: any,
    network_seed?	: string | null;
} & Location;

export type IssueAppAuthenticationTokenPayload = {
    installed_app_id	: string;
    expiry_seconds     ?: number;
    single_use	       ?: boolean;
};
export type AppAuthenticationTokenIssued = {
    token		: Uint8Array;
    expired_at	       ?: number;
};
