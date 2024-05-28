
import {
    AgentPubKey,
    DnaHash,
}					from '@spartan-hc/holo-hash';
import {
    parseHex,
    buildList,
}					from './utils.js';


export default function ( program, action_context, auto_help ) {
    const subprogram			= program
	.command("grants")
	.description("Manage capability grants")
	.action( auto_help );

    const create_subprogram		= subprogram
	.command("create")
	.description("Create capability grants")
	.action( auto_help );

    create_subprogram
	.command("unrestricted")
	.description("Create unrestricted cap grant")
	.argument("<tag>", "Cap grant tag (name)")
	.argument("<agent>", "Cell agent")
	.argument("<dna>", "Cell DNA hash")
	.option("-f, --function <string>", "add 'zome:function' to functions list", buildList, "*" )
	.action(
	    action_context(async function ({ log, admin }, tag, agent, dna_hash ) {
		const opts		= this.opts();

		const functions		= opts['function'] === "*"
		    ? opts['function']
		    : opts['function'].map( zome_function => zome_function.split(":") );

		const grant		= await admin.grantUnrestrictedCapability(
		    tag,
		    new AgentPubKey( agent ),
		    new DnaHash( dna_hash ),
		    functions,
		);

		return grant;
	    })
	);

    create_subprogram
	.command("transferable")
	.description("Create transferable cap grant")
	.argument("<tag>", "Cap grant tag (name)")
	.argument("<agent>", "Cell agent")
	.argument("<dna>", "Cell DNA hash")
	.argument("<secret>", "Capability secret")
	.option("-f, --function <string>", "add 'zome:function' to functions list", buildList, "*" )
	.option("--no-parse-secret", "keep secret input as a string")
	.action(
	    action_context(async function ({ log, admin }, tag, agent, dna_hash, secret_input ) {
		const opts		= this.opts();

		const functions		= opts['function'] === "*"
		    ? opts['function']
		    : opts['function'].map( zome_function => zome_function.split(":") );
		const secret		= opts.noParseSecret
		    ? secret_input
		    : parseHex( secret_input );

		const grant		= await admin.grantTransferableCapability(
		    tag,
		    new AgentPubKey( agent ),
		    new DnaHash( dna_hash ),
		    functions,
		    secret,
		);

		return grant;
	    })
	);

    create_subprogram
	.command("assigned")
	.description("Create assigned cap grant")
	.argument("<tag>", "Cap grant tag (name)")
	.argument("<agent>", "Cell agent")
	.argument("<dna>", "Cell DNA hash")
	.argument("<secret>", "Capability secret")
	.argument("<assignees...>", "Assigned agents")
	.option("-f, --function <string>", "add 'zome:function' to functions list", buildList, "*" )
	.option("--no-parse-secret", "keep secret input as a string")
	.action(
	    action_context(async function ({ log, admin }, tag, agent, dna_hash, secret_input, assignees ) {
		const opts		= this.opts();

		const functions		= opts['function'] === "*"
		    ? opts['function']
		    : opts['function'].map( zome_function => zome_function.split(":") );
		const secret		= opts.noParseSecret
		    ? secret_input
		    : parseHex( secret_input );

		const grant		= await admin.grantAssignedCapability(
		    tag,
		    new AgentPubKey( agent ),
		    new DnaHash( dna_hash ),
		    functions,
		    secret,
		    assignees.map( agent => new AgentPubKey(agent) ),
		);

		return grant;
	    })
	);

    return subprogram;
}
