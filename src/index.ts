
import {
    HoloHash,
    AgentPubKey,
    EntryHash,
    ActionHash,
    DnaHash,
    WasmHash,
}					from '@spartan-hc/holo-hash';
import {
    intoStruct,
    AnyType, OptionType,
    VecType, MapType,
}                                       from '@whi/into-struct';
import json                             from '@whi/json';
import { Bytes }			from '@whi/bytes-class';
import { encode, decode }		from '@msgpack/msgpack';
import {
    Connection,
    ConnectionOptions,
}					from '@spartan-hc/holochain-websocket';
import HolochainWebsocket		from '@spartan-hc/holochain-websocket';

import {
    log,
    reformat_app_info,
    reformat_cell_id,
    reformat_cell_errors,
    set_tostringtag,
    is_non_negative_number,
}					from './utils.js';
import { DeprecationNotice }		from './errors.js';
import {
    StateResponse,
    FullStateResponse,
}                                       from './structs.js';
import {
    Location,
    LocationValue,
    CellId,
    CapabilitySecret,
    CapabilityFunctions,
    Installation,
    RegisterDnaInput,
    InstallAppInput,
    AppInterfaceInfo,
    DnaDef,
    IssueAppAuthenticationTokenPayload,
    AppAuthenticationTokenIssued,
    AllowedOrigins,
}					from './types.js';


export async function sha512 ( bytes ) {
    if ( typeof crypto === "undefined" || !crypto.subtle )
	throw new Error(`SubtleCrypto (window.crypto.subtle) is required by @spartan-hc/holochain-admin-client for hashing cap secrets.`);

    return await crypto.subtle.digest("SHA-512", bytes );
}


const encoder                           = new TextEncoder();
async function hash_secret ( secret : string ) {
    return new Uint8Array( await sha512( encoder.encode(secret) ) );
}


function normalize_granted_functions ( granted_functions ) {
    // Supports
    //
    //   - *
    //   - array<(zome, fn)>
    //   - object<zome, array<fn>>
    //
    if ( granted_functions === undefined )
	throw new TypeError(`Invalid granted functions input; expected *, array<(zome, fn)>, or object<zome, array<fn>>`);

    const functions_input		= granted_functions === "*"
	? "All"
	: {
	    "Listed": granted_functions,
	};

    if ( granted_functions === "*" || Array.isArray( granted_functions ) )
	return functions_input;

    const functions		= [];
    for ( let zome_name in granted_functions ) {
	if ( !Array.isArray( granted_functions[ zome_name ] ) )
	    throw new TypeError(`Invalid granted functions object; functions must be an array, not type '${typeof granted_functions[ zome_name ]}'`);

	for ( let fn_name of granted_functions[ zome_name ] ) {
	    if ( typeof fn_name !== "string" )
		throw new TypeError(`Invalid granted functions object; function name must be a string, not type '${typeof fn_name}'`);

	    functions.push( [ zome_name, fn_name ] );
	}
    }
    functions_input["Listed"]		= functions;

    return functions_input;
}


function deep_compare ( a, b ) {
    for ( let i in a ) {
	if ( a[i] === b[i] )
	    continue;

	const c				= a[i];
	const d				= b[i];

	if ( typeof c === "object" ) {
	    if ( typeof d !== "object" ) // object's have a higher value than primitives
		return 1;

	    const sub_sort		= deep_compare( c, d );

	    if ( sub_sort === 0 )
		continue;
	    else
		return sub_sort;
	}

	if ( typeof d === "object" )
	    return -1;

	if ( c > d )
	    return 1;
	else
	    return -1;
    }

    return 0;
}

export class AdminClient {
    static APPS_ENABLED			= "Enabled";
    static APPS_DISABLED		= "Disabled";
    static APPS_RUNNING			= "Running";
    static APPS_STOPPED			= "Stopped";
    static APPS_PAUSED			= "Paused";

    #conn:		any;
    #conn_load:		Promise<void>;

    constructor ( connection, opts : ConnectionOptions = {} ) {
	this.#conn_load			= new Promise(async (f,r) => {
	    this.#conn			= connection instanceof Connection
		? connection
		: new Connection( connection, { "name": "admin", ...opts });
	    f();
	});
    }

    async connection () : Promise<Connection> {
	await this.#conn_load;
	return this.#conn;
    }

    async #request (
	method			: string,
	args		       ?: any,
	timeout		       ?: number,
    ) : Promise<any> {
	const conn			= await this.connection();

	if ( conn.opened === false ) {
	    log.debug && log("Opening connection '%s' for AdminClient", conn.name );
	    await conn.open();
	}

	log.debug && log("Calling '%s': %s", method, json.debug(args) );
	return await conn.request( method, args, timeout ?? 30_000 );
    }

    async attachAppInterface (
	port?			: number,
	allowed_origins_input	: AllowedOrigins = "*",
	installed_app_id	: string | null = null,
    ) : Promise<{ port: number }> {
	const allowed_origins		= Array.isArray(allowed_origins_input)
	    ? allowed_origins_input.join(", ")
	    : allowed_origins_input;

	let resp			= await this.#request("attach_app_interface", {
	    "port": port,
	    allowed_origins,
	    installed_app_id,
	});

	return resp;
    }

    async addAdminInterface (
	port			: number,
	allowed_origins_input  ?: AllowedOrigins,
    ) : Promise<void> {
	return await this.addAdminInterfaces( [ port ], allowed_origins_input );
    }

    async addAdminInterfaces (
	ports			: Array<number>,
	allowed_origins_input	: AllowedOrigins = "*",
    ) : Promise<void> {
	const allowed_origins		= Array.isArray(allowed_origins_input)
	    ? allowed_origins_input.join(", ")
	    : allowed_origins_input;

	let resp			= await this.#request("add_admin_interfaces", ports.map( port => {
	    return {
		"driver": {
		    "type": "websocket",
		    "port": port,
		    "allowed_origins": allowed_origins,
		},
	    };
	}) );

	// The response value is 'undefined' but we return it anyway in case Conductor starts
	// sending feedback.
	return resp;
    }

    async generateAgent () : Promise<AgentPubKey> {
	return new AgentPubKey( await this.#request("generate_agent_pub_key") );
    }

    async registerDna (
	path			: LocationValue,
	modifiers		: any,
    ) : Promise<DnaHash> {
	modifiers			= Object.assign( {}, {
	    "network_seed": null, // String
	    "properties": null, // Object or msgpacked bytes?
	    "origin_time": null, // Timestamp
	    "quantum_time": null, // Duration
	}, modifiers );

	let location : Location		= path instanceof DnaHash
	    ? { "hash": path as DnaHash }
	    : { "path": path as string };

	if ( modifiers.quantum_time ) {
	    // Quantum time can be a tuple of [ seconds, nanoseconds ]
	    if ( Array.isArray( modifiers.quantum_time ) ) {
		if ( modifiers.quantum_time.length !== 2 )
		    throw new TypeError(`Quantum time array format expects a pair of [ seconds, nanoseconds ]; not '[${modifiers.quantum_time}]'`);

		if ( !is_non_negative_number( modifiers.quantum_time[0] ) )
		    throw new TypeError(`Quantum time array format expects seconds to be a positive number; not '${modifiers.quantum_time[0]}'`);

		if ( !is_non_negative_number( modifiers.quantum_time[1] ) )
		    throw new TypeError(`Quantum time array format expects nanoseconds to be a positive number; not '${modifiers.quantum_time[1]}'`);
	    }
	}

	let input : RegisterDnaInput	= {
	    modifiers,
	    ...location,
	};

	return new DnaHash( await this.#request("register_dna", input ) );
    }

    async getDnaDefinition (
	hash			: DnaHash,
    ) : Promise<DnaDef> {
	const dna_def			= await this.#request("get_dna_definition", hash );

	dna_def.integrity_zomes.map( ([_, zome_def]) => {
	    zome_def.wasm_hash		= new WasmHash(zome_def.wasm_hash);
	});

	dna_def.coordinator_zomes.map( ([_, zome_def]) => {
	    zome_def.wasm_hash		= new WasmHash(zome_def.wasm_hash);
	});

	return dna_def;
    }

    // TODO:
    // async updateCoordinators (
    // 	input			: UpdateCoordinatorsPayload,
    // ) : Promise<void> {
    // }

    async installApp (
	app_id			: string,
	agent_hash		: AgentPubKey,
	happ_bundle		: any,
	options		       ?: any,
    ) : Promise<Installation> {
	options				= Object.assign( {}, {
	    "membrane_proofs": {},
	    "network_seed": null, // overrite bundle DNAs
	    "encode_membrane_proofs": true,
	}, options );

	if ( ["string", "object"].includes( happ_bundle ) || happ_bundle === null )
	    throw new TypeError(`Unknown hApp bundle type '${typeof happ_bundle}'; expected a String or Uint8Array`);

	if ( app_id === "*" )
	    app_id			= ( Math.random() * 1e17 ).toString(16).slice(0,8);

	const input : InstallAppInput	= Object.assign({
	    "installed_app_id": app_id,
	    "agent_key": new AgentPubKey(agent_hash),
	    "membrane_proofs": { ...options.membrane_proofs },
	    "network_seed": options.network_seed,
	}, typeof happ_bundle === "string" ? {
	    "path": happ_bundle,
	} : {
	    "bundle": happ_bundle,
	});

	if ( options.encode_membrane_proofs === true ) {
	    for ( let role in input.membrane_proofs ) {
		input.membrane_proofs[role] = encode( input.membrane_proofs[role] );
	    }
	}

	// Temporary fix for a bug in mr_bundle
	if ( "bundle" in input ) {
	    for ( let rpath in input.bundle.resources ) {
		input.bundle.resources[ rpath ]	= Array.from( input.bundle.resources[ rpath ] );
	    }
	}

	const app_info			= await this.#request("install_app", input, 60_000 );

	return await reformat_app_info( app_info );
    }

    async uninstallApp ( app_id: string ) : Promise<void> { // -> undefined (expected)
	return await this.#request("uninstall_app", {
	    "installed_app_id": app_id,
	});
    }

    async enableApp ( app_id: string ) {
	let resp			= await this.#request("enable_app", {
	    "installed_app_id": app_id,
	});

	resp.app			= await reformat_app_info( resp.app );
	resp.errors			= reformat_cell_errors( resp.errors );

	return resp;
    }

    async disableApp ( app_id: string ) { // -> undefined (expected)
	return await this.#request("disable_app", {
	    "installed_app_id": app_id,
	});
    }

    async listDnas () : Promise<Array<DnaHash>> {
	const dnas			= await this.#request("list_dnas");

	dnas.forEach( (dna, i) => {
	    dnas[i]			= new DnaHash( dna );
	});
	dnas.sort( deep_compare );

	log.debug && log("DNAs (%s): %s", dnas.length, dnas );
	return dnas;
    }

    async listCells () : Promise<Array<[ DnaHash, AgentPubKey ]>> {
	const cells			= await this.#request("list_cell_ids");

	cells.forEach( (cell, i) => {
	    cells[i]			= [ new DnaHash( cell[0] ), new AgentPubKey( cell[1] ) ];
	});
	cells.sort( deep_compare );

	log.debug && log("Cells (%s): %s", cells.length, JSON.stringify( cells ) );
	return cells;
    }

    async listCellIds () : Promise<Array<[ DnaHash, AgentPubKey ]>> {
	return await this.listCells();
    }

    async listApps (
	status: string = "Running", // Holochain's default is 'Running'
    ) : Promise<Array<Installation>> {
	// Enabled,
	// Disabled,
	// Running,
	// Stopped,
	// Paused,
	status				= status.charAt(0).toUpperCase() + status.slice(1);
	const apps			= await this.#request("list_apps", {
	    "status_filter": status,
	});

	log.debug && log("Apps (%s): %s", apps.length, apps.map( x => x.installed_app_id ).join(", ") );
	return await Promise.all(
	    apps.map( async info => await reformat_app_info( info ) )
	);
    }

    async listAppInterfaces () : Promise<Array<AppInterfaceInfo>> {
	const ifaces			= await this.#request("list_app_interfaces");

	for ( let i in ifaces ) {
	    const allowed_origins	= ifaces[i].allowed_origins;

	    if ( typeof allowed_origins === "string" && allowed_origins !== "*" ) {
		ifaces[i].allowed_origins	= allowed_origins.split(",");
		ifaces[i].allowed_origins.sort();
	    }
	}

	log.debug && log("Interfaces (%s):", ifaces.length, ifaces );
	return ifaces;
    }

    async listActiveAgents () : Promise<Array<AgentPubKey>> {
	const agent_infos			= await this.requestAgentInfo();
	const cell_agents : Uint8Array[]	= agent_infos.map( info => info.agent.toString() );

	const unique_agents			= [ ...new Set( cell_agents ) ]
	      .map( hash => new AgentPubKey(hash) );
	unique_agents.sort( deep_compare );

	log.debug && log("Agents (%s): %s", unique_agents.length, unique_agents );
	return unique_agents;
    }

    async cellState (
	dna_hash:	DnaHash,
	agent_hash:	AgentPubKey,
    ) {
	const state_json		= await this.#request("dump_state", {
	    "cell_id": [
		new DnaHash( dna_hash ),
		new AgentPubKey( agent_hash ),
	    ],
	});
	const state_resp		= JSON.parse( state_json );

	// console.log("State Dump raw: %s", json.debug( state_resp ) );

        return intoStruct( state_resp, StateResponse )[0];
    }

    async cellStateFull (
	dna_hash:	DnaHash,
	agent_hash:	AgentPubKey,
    ) {
	const state_resp		= await this.#request("dump_full_state", {
	    "cell_id": [
		new DnaHash( dna_hash ),
		new AgentPubKey( agent_hash ),
	    ],
	});

	// console.log("State Dump raw: %s", json.debug( state_resp ) );

        return intoStruct( state_resp, FullStateResponse );
    }

    async requestAgentInfo (
	cell_id			: CellId = null,
    ) {
	const infos			= await this.#request("agent_info", {
	    "cell_id": cell_id,
	});

	infos.forEach( (info, i) => {
	    info.agent			= new AgentPubKey( info.agent );
	    info.signature		= new Bytes( info.signature );
	    info.agent_info		= decode( info.agent_info );

	    info.agent_info.agent	= new AgentPubKey( info.agent_info.agent );
	    info.agent_info.space	= new Bytes( info.agent_info.space );
	    info.agent_info.meta_info	= decode( info.agent_info.meta_info );
	});

	log.debug && log("Infos (%s): %s", infos.length, infos );
	return infos;
    }

    async grantCapability (
	tag			: string,
	agent			: AgentPubKey,
	dna			: DnaHash,
	functions		: CapabilityFunctions,
	secret		       ?: CapabilitySecret,
	assignees	       ?: Array<AgentPubKey>,
    ) : Promise<boolean> {
	if ( assignees !== undefined )
	    return await this.grantAssignedCapability( tag, agent, dna, functions, secret, assignees );
	else if ( secret !== undefined )
	    return await this.grantTransferableCapability( tag, agent, dna, functions, secret );
	else
	    return await this.grantUnrestrictedCapability( tag, agent, dna, functions );
    }

    async grantUnrestrictedCapability (
	tag			: string,
	agent			: AgentPubKey,
	dna			: DnaHash,
	functions		: CapabilityFunctions,
    ) : Promise<boolean> {
	const input			= {
	    "cell_id": [ dna, agent ],
	    "cap_grant": {
		"tag": tag,
		"functions": normalize_granted_functions( functions ),
		"access": "Unrestricted",
	    },
	};

	await this.#request("grant_zome_call_capability", input );

	return true;
    }

    async grantTransferableCapability (
	tag			: string,
	agent			: AgentPubKey,
	dna			: DnaHash,
	functions		: CapabilityFunctions,
	secret			: CapabilitySecret,
    ) : Promise<boolean> {
	// if secret is a string, hash it so it meets the 512 bit requirement
	if ( typeof secret === "string" )
	    secret			= await hash_secret( secret );

	const input			= {
	    "cell_id": [ dna, agent ],
	    "cap_grant": {
		"tag": tag,
		"functions": normalize_granted_functions( functions ),
		"access": {
		    "Transferable": {
			"secret": secret,
		    },
		},
	    },
	};

	await this.#request("grant_zome_call_capability", input );

	return true;
    }

    async grantAssignedCapability (
	tag			: string,
	agent			: AgentPubKey,
	dna			: DnaHash,
	functions		: CapabilityFunctions,
	secret			: CapabilitySecret,
	assignees	       ?: Array<AgentPubKey>,
    ) : Promise<boolean> {
	// if secret is a string, hash it so it meets the 512 bit requirement
	if ( typeof secret === "string" )
	    secret			= await hash_secret( secret );

	const input			= {
	    "cell_id": [ dna, agent ],
	    "cap_grant": {
		"tag": tag,
		"functions": normalize_granted_functions( functions ),
		"access": {
		    "Transferable": {
			"secret": secret,
			"assignees": assignees,
		    },
		},
	    },
	};

	await this.#request("grant_zome_call_capability", input );

	return true;
    }

    async issueAppAuthenticationToken (
	input			: IssueAppAuthenticationTokenPayload,
    ) : Promise<AppAuthenticationTokenIssued> {
	const issued_auth		= await this.#request("issue_app_authentication_token", input );

	issued_auth.token		= new Bytes( issued_auth.token );

	return issued_auth;
    }

    async revokeAppAuthenticationToken (
	token			: Uint8Array,
    ) : Promise<void> {
	// Authenticate input requires the token to be an Array
	const token_input		= [ ...token ];
	await this.#request("revoke_app_authentication_token", token_input );
    }

    async close (
	timeout		       ?: number,
    ) : Promise<void> {
	const conn			= await this.connection();
	return await conn.close( timeout );
    }

    toString () : string {
	return "AdminClient" + String( this.#conn );
    }
}
set_tostringtag( AdminClient );


export function logging () {
    log.debug				= true;
}


export {
    DeprecationNotice,

    // Sub-package from @spartan-hc/holochain-websocket
    HolochainWebsocket,
};

export * from './types.js';

export default {
    AdminClient,
    DeprecationNotice,
    sha512,

    // Sub-package from @spartan-hc/holochain-websocket
    HolochainWebsocket,
};
