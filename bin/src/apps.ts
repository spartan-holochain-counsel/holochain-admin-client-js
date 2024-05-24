
import { Argument }			from 'commander';
import {
    AgentPubKey,
}					from '@spartan-hc/holo-hash';


type InstallOpts = {
    network_seed	       ?: string;
};


export default function ( program, action_context, auto_help ) {
    const subprogram			= program
	.command("apps")
	.description("Manage apps")
	.action( auto_help );

    subprogram
	.command("list")
	.description("List apps")
	.addArgument(
	    new Argument('[status]', 'Cell status (default: running)')
		.choices([
		    "enabled",
		    "disabled",
		    "running",
		    "stopped",
		    "paused",
		])
	)
	.action(
	    action_context(async function ({ log, admin }, status ) {
		const opts		= this.opts();
		const apps		= await admin.listApps( status );

		return apps;
	    })
	);

    subprogram
	.command("install")
	.description("Install app")
	.argument("<agent>", "Cell agent")
	.argument("<path>", "Path to hApp")
	.option("-i, --app-id <string>", "installed app ID")
	.option("-n, --network-seed <string>", "network seed")
	.action(
	    action_context(async function ({ log, admin }, agent, happ_path ) {
		const opts		= this.opts();
		const install_opts 	= {} as InstallOpts;

		if ( opts.networkSeed )
		    install_opts.network_seed	= opts.networkSeed;

		const agents		= await admin.installApp(
		    opts.appId ?? "*",
		    new AgentPubKey( agent ),
		    happ_path,
		    install_opts,
		);

		return agents;
	    })
	);

    subprogram
	.command("uninstall")
	.description("Uninstall app")
	.argument("<app_id>", "Installed app ID")
	.action(
	    action_context(async function ({ log, admin }, app_id ) {
		const uninstall		= await admin.uninstallApp( app_id );

		return uninstall;
	    })
	);

    subprogram
	.command("enable")
	.description("Enable app")
	.argument("<app_id>", "Installed app ID")
	.action(
	    action_context(async function ({ log, admin }, app_id ) {
		const enabled		= await admin.enableApp( app_id );

		return enabled;
	    })
	);

    subprogram
	.command("disable")
	.description("Disable app")
	.argument("<app_id>", "Installed app ID")
	.action(
	    action_context(async function ({ log, admin }, app_id ) {
		const disabled		= await admin.disableApp( app_id );

		return disabled;
	    })
	);

    return subprogram;
}
