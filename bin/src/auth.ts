
import {
    IssueAppAuthenticationTokenPayload,
}					from '../../lib/node.js';


export default function ( program, action_context, auto_help ) {
    const subprogram			= program
	.command("auth")
	.description("Manage app authentication tokens")
	.action( auto_help );

    subprogram
	.command("create")
	.description("Issue new token")
	.argument("<app_id>", "Installed app ID")
	.option("-e, --expiry-seconds <seconds>", "seconds until auth expires", parseInt )
	.option("-s, --single-use", "set token option 'single-use' to true")
	.option("-m, --multi-use", "set token option 'single-use' to false")
	.action(
	    action_context(async function ({ log, admin }, app_id ) {
		const opts		= this.opts();

		const input		= {
		    "installed_app_id":	app_id,
		} as IssueAppAuthenticationTokenPayload;

		if ( opts.expirySeconds !== undefined )
		    input.expiry_seconds	= opts.expirySeconds;

		if ( opts.multiUse )
		    input.single_use		= !opts.multiUse;

		if ( opts.singleUse )
		    input.single_use		= opts.singleUse;

		const auth		= await admin.issueAppAuthenticationToken( input );

		return auth;
	    })
	);

    subprogram
	.command("delete")
	.description("Revoke token")
	.argument("<token>", "Auth token")
	.action(
	    action_context(async function ({ log, admin }, token ) {
		const opts		= this.opts();
		const token_bytes	= Buffer.from( token, "hex" );

		await admin.revokeAppAuthenticationToken(
		    token_bytes
		);
	    })
	);

    return subprogram;
}
