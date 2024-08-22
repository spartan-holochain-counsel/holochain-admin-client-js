
import {
    SubProgramInit,
}					from './types.js';
import {
    AgentPubKey,
    DnaHash,
}					from '@spartan-hc/holo-hash';

export default (function ( program, action_context, auto_help ) {
    const subprogram			= program
	.command("cells")
	.description("Manage cells")
	.action( auto_help );

    subprogram
	.command("get")
	.description("Get a cell ID")
	.argument("<app_id>", "Installed App ID")
	.argument("<role_id>", "Role ID within specified app")
	.action(
	    action_context(async function ({ log, admin }, app_id, role_id ) {
		const opts		= this.opts();
                const cell_id           = await admin.getCellId( app_id, role_id );

                return cell_id;
	    })
	);

    const list_subprogram               = subprogram
	.command("list")
	.description("List cells")
	.argument("[app_id]", "Installed App ID filter")
	.action(
	    action_context(async function ({ log, admin }, app_id ) {
		const opts		= this.opts();
                const cells             = await admin.listCellsWithContext( app_id );

                return cells;
	    })
	);

    list_subprogram
	.command("ids")
	.description("List cell IDs")
	.argument("[app_id]", "Installed App ID filter")
	.action(
	    action_context(async function ({ log, admin }, app_id ) {
		const opts		= this.opts();
                const cells             = await admin.listCellIds( app_id );

                return cells;
	    })
	);

    subprogram
	.command("dump")
	.description("Dump cell state")
	.option("-f, --full", "Include DHT records")
	.argument("<cell_id>", "Cell ID (dna/agent) or named reference (app::role)")
	.action(
	    action_context(async function ({ log, admin }, input ) {
		const opts		= this.opts();
                let dna;
                let agent;

                if ( input.includes("/") ) {
                    const [agent_pubkey, dna_hash]  = input.split("/");
		    agent               = new AgentPubKey( agent_pubkey );
                    dna                 = new DnaHash( dna_hash );
                }
                else {
                    const [app_id, role_id] = input.split("::");
                    const cell_id       = await admin.getCellId( app_id, role_id );

                    dna                 = cell_id[0];
		    agent               = cell_id[1];
                }

                const chain             = opts.full !== true
                    ? await admin.cellState( dna, agent )
                    : await admin.cellStateFull( dna, agent );

		return chain;
	    })
	);

    return subprogram;
} as SubProgramInit);
