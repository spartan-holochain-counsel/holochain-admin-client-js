
import {
    buildList,
}					from './utils.js';


export default function ( program, action_context, auto_help ) {
    const subprogram			= program
	.command("interfaces")
	.description("Manage interfaces")
	.action( auto_help );

    subprogram
	.command("list")
	.description("List all interfaces (app and admin)")
	.action(
	    action_context(async function ({ log, admin }, status ) {
		const opts		= this.opts();
		const app_ifaces	= await admin.listAppInterfaces();

		return app_ifaces;
	    })
	);

    const app_subprogram		= subprogram
	.command("app")
	.description("Manage app interfaces")
	.action( auto_help );

    app_subprogram
	.command("create")
	.description("Attach app interface")
	.argument("[port]", "Set a specific app port", parseInt )
	.option("-o, --allowed-origins <string>", "Set allowed origins (default: *)", buildList, "*" )
	.option("-i, --app-id <string>", "limit interface to a specific installed app ID")
	.action(
	    action_context(async function ({ log, admin }, port ) {
		const opts		= this.opts();
		const result		= await admin.attachAppInterface(
		    port,
		    opts.allowedOrigins.join(","),
		    opts.appId,
		);

		return result;
	    })
	);

    const admin_subprogram		= subprogram
	.command("admin")
	.description("Manage admin interfaces")
	.action( auto_help );

    admin_subprogram
	.command("create")
	.description("Add admin interface")
	.argument("[port]", "Set a specific app port", parseInt )
	.option("-o, --allowed-origins <string>", "Set allowed origins (default: *)", buildList, "*" )
	.action(
	    action_context(async function ({ log, admin }, port ) {
		const opts		= this.opts();
		const result		= await admin.attachAppInterface(
		    port,
		    opts.allowedOrigins,
		);

		return result;
	    })
	);

    return subprogram;
}
