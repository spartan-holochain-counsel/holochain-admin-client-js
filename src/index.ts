
import {
    HoloHash,
    AgentPubKey,
    EntryHash,
    ActionHash,
    DnaHash,
    WasmHash,
}					from '@spartan-hc/holo-hash';
import { encode, decode }		from '@msgpack/msgpack';
import {
    Connection,
    ConnectionOptions,
}					from '@spartan-hc/holochain-websocket';
import HolochainWebsocket		from '@spartan-hc/holochain-websocket';

import { log,
	 reformat_app_info,
	 reformat_cell_id,
	 reformat_cell_errors,
	 set_tostringtag }		from './utils.js';
import { DeprecationNotice }		from './errors.js';
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
}					from './types.js';


export async function sha512 ( bytes ) {
    if ( typeof crypto === "undefined" || !crypto.subtle )
	throw new Error(`SubtleCrypto (window.crypto.subtle) is required by @spartan-hc/holochain-admin-client for hashing cap secrets.`);

    return await crypto.subtle.digest("SHA-512", bytes );
}


async function hash_secret ( secret ) {
    return new Uint8Array( await sha512( secret ) );
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

    if ( granted_functions === "*" )
	granted_functions		= null;

    const functions_type		= granted_functions === null ? "All" : "Listed";
    const functions_input		= {
	[functions_type]: granted_functions,
    };

    if ( granted_functions === null || Array.isArray( granted_functions ) )
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
    functions_input[ functions_type ]	= functions;

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

	log.debug && log("Calling '%s':", method, args );
	return await conn.request( method, args, timeout );
    }

    async attachAppInterface (
	port?			: number,
	allowed_origins		: string = "*",
	installed_app_id       ?: string,
    ) : Promise<{ port: number }> {
	let resp			= await this.#request("attach_app_interface", {
	    "port": port,
	    allowed_origins,
	    installed_app_id,
	});

	return resp;
    }

    async addAdminInterface (
	port			: number,
	allowed_origins	       ?: string,
    ) : Promise<void> {
	return await this.addAdminInterfaces( [ port ], allowed_origins );
    }

    async addAdminInterfaces (
	ports			: Array<number>,
	allowed_origins		: string = "*",
    ) : Promise<void> {
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

	const app_info			= await this.#request("install_app", input );

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
	    "status_filter": {
		[status]: null,
	    },
	});

	log.debug && log("Apps (%s): %s", apps.length, apps.map( x => x.installed_app_id ).join(", ") );
	return await Promise.all(
	    apps.map( async info => await reformat_app_info( info ) )
	);
    }

    async listAppInterfaces () : Promise<Array<AppInterfaceInfo>> {
	const ifaces			= await this.#request("list_app_interfaces");

	log.debug && log("Interfaces (%s):", ifaces.length, ifaces );
	return ifaces;
    }

    async listAgents () : Promise<Array<AgentPubKey>> {
	const agent_infos			= await this.requestAgentInfo();
	const cell_agents			= agent_infos.map( info => info.agent.toString() );

	const unique_agents			= [ ...new Set( cell_agents ) ]
	      .map( hash => new AgentPubKey(hash) );
	unique_agents.sort( deep_compare );

	log.debug && log("Agents (%s): %s", unique_agents.length, unique_agents );
	return unique_agents;
    }

    async cellState (
	dna_hash:	DnaHash,
	agent_hash:	AgentPubKey,
	start?:		number,
	end?:		number,
    ) {
	const state_json		= await this.#request("dump_state", {
	    "cell_id": [
		new DnaHash( dna_hash ),
		new AgentPubKey( agent_hash ),
	    ],
	});
	const state_resp		= JSON.parse( state_json );
	const state			= state_resp[0];
	const state_summary		= state_resp[1]; // string

	// state.peer_dump.this_agent_info.kitsune_agent
	// state.peer_dump.this_agent_info.kitsune_space
	// state.peer_dump.this_agent_info.dump
	// state.peer_dump.this_dna[0]
	// state.peer_dump.this_dna[1]
	// state.peer_dump.this_agent[0]
	// state.peer_dump.this_agent[1]
	// state.peer_dump.peers[]
	// state.source_chain_dump.records[0].signature
	// state.source_chain_dump.records[0].action_address
	// state.source_chain_dump.records[0].action.type
	// state.source_chain_dump.records[0].action.author
	// state.source_chain_dump.records[0].action.timestamp[0]
	// state.source_chain_dump.records[0].action.timestamp[1]
	// state.source_chain_dump.records[0].action.hash
	// state.source_chain_dump.records[0].action.action_seq
	// state.source_chain_dump.records[0].action.prev_action
	// state.source_chain_dump.records[0].action.entry_type{App?}
	// state.source_chain_dump.records[0].action.entry_hash
	// state.source_chain_dump.records[0].entry.entry_type = "App"
	// state.source_chain_dump.records[0].entry.entry
	function agent_info ( agent_info ) {
	    return {
		"agent": new Uint8Array( agent_info.kitsune_agent ),
		"space": new Uint8Array( agent_info.kitsune_space ),
	    };
	}

	state.kitsune			= agent_info( state.peer_dump.this_agent_info );
	state.cell			= {
	    "agent": new AgentPubKey(	new Uint8Array(state.peer_dump.this_agent[0]) ),
	    "dna":   new DnaHash(	new Uint8Array(state.peer_dump.this_dna[0])   ),
	};
	state.peers			= state.peer_dump.peers.map( (peer_agent_info) => {
	    return agent_info( peer_agent_info );
	});

	delete state.peer_dump;

	if ( start || end ) {
	    state.source_chain_dump.records	= state.source_chain_dump.records.slice( start, end );
	}

	state.source_chain_dump.records.forEach( (record, i) => {
	    record.signature			= new Uint8Array( record.signature );
	    record.action_address		= new ActionHash(  new Uint8Array(record.action_address) );
	    record.action.author		= new AgentPubKey( new Uint8Array(record.action.author) );

	    if ( record.action.hash )
		record.action.hash		= new HoloHash(    new Uint8Array(record.action.hash) );

	    if ( record.action.prev_action )
		record.action.prev_action	= new ActionHash(  new Uint8Array(record.action.prev_action) );

	    if ( record.action.entry_hash ) {
		record.action.entry_hash	= new EntryHash(   new Uint8Array(record.action.entry_hash) );
		try {
		    const length		= record.entry.entry.length;
		    record.entry.entry		= decode( record.entry.entry );
		    record.entry.length	= length;
		} catch (err) {
		    record.entry.entry		= new Uint8Array( record.entry.entry );
		}
	    }

	    // CreateLink properties
	    if ( record.action.base_address )
		record.action.base_address	= new EntryHash(   new Uint8Array(record.action.base_address) );
	    if ( record.action.target_address )
		record.action.target_address	= new EntryHash(   new Uint8Array(record.action.target_address) );

	    if ( record.action.tag ) {
		const prefix			= record.action.tag.slice(0,8).map( n => String.fromCharCode(n) ).join("");

		if ( prefix === "hdk.path" ) {
		    const bytes			= record.action.tag.slice(11);
		    const segments		= [];
		    let segment			= [];
		    let uint32			= [];
		    bytes.forEach( (n, i) => {
			// If we are at the start of a new byte
			if ( n !== 0
			     && bytes[i-1] === 0
			     && bytes[i-2] === 0
			     && bytes[i-3] === 0 ) {
			    // If the length is greater than 4, then we want to reset the segment as
			    // well as the uint32
			    if ( uint32.length > 4 ) {
				segments.push( new Uint8Array(segment) );

				segment		= [];
				segment.push( ...uint32.slice(-4) );

				uint32		= [];
			    }
			    else {
				segment.push( ...uint32 );
				uint32		= [];
			    }
			}

			uint32.push( n );
		    });

		    segment.push( ...uint32 );
		    segments.push( new Uint8Array(segment) );


		    segments.forEach( (seg, i) => {
			const codes		= new Uint32Array( seg.buffer, seg.byteOffset, seg.byteLength / 4 );
			segments[i]		= [].map.call( codes, n => String.fromCharCode(n) ).join("");
		    });

		    record.action.tag_string	= segments.join(".");
		}
		else {
		    record.action.tag_string	= "hdk.path(" + record.action.tag.map( n => String.fromCharCode(n) ).join("") + ")";
		}

		record.action.tag		= new Uint8Array( record.action.tag );
	    }
	});

	state.published_ops_count		= state.source_chain_dump.published_ops_count;
	state.source_chain			= state.source_chain_dump.records;

	delete state.source_chain_dump;

	return state;
    }

    async requestAgentInfo (
	cell_id			: CellId = null,
    ) {
	const infos			= await this.#request("agent_info", {
	    "cell_id": cell_id,
	});

	infos.forEach( (info, i) => {
	    info.agent			= new AgentPubKey( info.agent );
	    info.signature		= new Uint8Array( info.signature );
	    info.agent_info		= decode( info.agent_info );

	    info.agent_info.agent	= new Uint8Array( info.agent_info.agent );
	    info.agent_info.space	= new Uint8Array( info.agent_info.space );
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
		"access": {
		    "Unrestricted": null,
		},
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

	issued_auth.token		= new Uint8Array( issued_auth.token );

	return issued_auth;
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
