
import {
    AgentPubKey,
    DnaHash,
}					from '@spartan-hc/holo-hash';


export default function ( program, action_context, auto_help ) {
    const subprogram			= program
	.command("agents")
	.description("Manage agents")
	.action( auto_help );

    subprogram
	.command("list")
	.description("List active agents")
	.action(
	    action_context(async function ({ log, admin }) {
		const opts		= this.opts();
		const agents		= await admin.listActiveAgents();

		return agents;
	    })
	);

    subprogram
	.command("create")
	.description("Generate new agent")
	.action(
	    action_context(async function ({ log, admin }) {
		const opts		= this.opts();
		const agent		= await admin.generateAgent();

		return agent;
	    })
	);

    subprogram
	.command("info")
	.description("Request agent info")
	.argument("<agent>", "Cell agent")
	.argument("<dna>", "Cell DNA hash")
	.action(
	    action_context(async function ({ log, admin }, agent, dna_hash ) {
		const opts		= this.opts();

		const info		= await admin.requestAgentInfo([
		    new DnaHash( dna_hash ),
		    new AgentPubKey( agent ),
		]);

		return info;
	    })
	);

    return subprogram;
}
