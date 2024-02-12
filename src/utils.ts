
import { decode }			from '@msgpack/msgpack';
import { DnaHash,
	 AgentPubKey }			from '@spartan-hc/holo-hash';
import {
    CellId,
    ProvisionedCell,
    ClonedCell,
    StemCell,
    CellInfoData,
    CellInfoProvisioned,
    CellInfoCloned,
    CellInfoStem,
    CellInfo,
    Role,
    AppInfo,
    Installation,
    DnaModifiersDecoded,
}					from './types';


export function set_tostringtag (
    cls: new (...args) => any,
    name?: string,
) : void {
    Object.defineProperty( cls, "name", {
	value: name || cls.name,
    });
    Object.defineProperty( cls.prototype, Symbol.toStringTag, {
	value: name || cls.name,
	enumerable: false,
    });
}


export function reformat_cell_errors ( cell_errors ) {
    log.debug && log("Reformatting cell %s errors", cell_errors.length );

    for ( let i in cell_errors ) {
	let [ cell_id, error ]		= cell_errors[i];
	cell_errors[i]			= {
	    "cell_id": reformat_cell_id( cell_id ),
	    "error": error,
	}
    }

    return cell_errors;
}


export function reformat_cell_id ( cell_id: [Uint8Array, Uint8Array] ) : CellId {
    return [
	new DnaHash(	 cell_id[0] ),
	new AgentPubKey( cell_id[1] ),
    ];
}


export async function reformat_app_info ( app_info: AppInfo ) : Promise<Installation> {
    log.debug && log("Reformatting app info: %s", app_info.installed_app_id );

    const installation : Installation = {
	"agent_pub_key":	new AgentPubKey( app_info.agent_pub_key ),
	"installed_app_id":	app_info.installed_app_id,
	"manifest":		app_info.manifest,
	"roles":		{},
	"cell_info":		app_info.cell_info,
	"running":		"running" in app_info.status,
	"status":		app_info.status,
    };

    for ( let [role_name, cells] of Object.entries( app_info.cell_info ) ) {
	// The first cell info is the original provisioned one.  The rest are clones.
	const base_cell			= cells.shift();
	let cell_info : CellInfoData;
	let cell_id : CellId = null;

	if ( "provisioned" in base_cell ) {
	    cell_info			= base_cell.provisioned;
	    cell_id			= reformat_cell_id( cell_info.cell_id );
	}
	else if ( "stem" in base_cell ) {
	    cell_info			= base_cell.stem;
	}

	const dna_modifiers_decoded : DnaModifiersDecoded = {
	    ...cell_info.dna_modifiers,
	    "properties":		decode( cell_info.dna_modifiers.properties ),
	};

	const role : Role		= {
	    "provisioned":	"provisioned" in base_cell,
	    "cell_id":		cell_id,
	    "cloned":		[],
	    "dna_modifiers":	dna_modifiers_decoded,
	};

	for ( let cell of cells ) {
	    if ( "cloned" in cell ) {
		const cloned		= cell.cloned as any;

		cloned.cell_id		= reformat_cell_id( cloned.cell_id );

		role.cloned.push( cloned );
	    }
	    else
		throw new TypeError(`Unknown cell info format: ${Object.keys(cell)}`);
	}

	installation.roles[ role_name ] = role;
    }

    return installation;
}


export function log ( msg: string, ...args: Array<any> ) : void {
    let datetime			= (new Date()).toISOString();
    console.log(`${datetime} [ src/index. ]  INFO: ${msg}`, ...args );
}
log.debug				= false;
