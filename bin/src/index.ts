#!/usr/bin/env node
// -*- mode: typescript -*-
import { Logger }			from '@whi/weblogger';
const log				= new Logger("hc-admin", "fatal" );

import fs				from 'fs/promises';
import path				from 'path';

import json				from '@whi/json';
import {
    Command,
    Option,
}					from 'commander';
import {
    AdminClient,
}					from '../../lib/node.js';

import {
    ActionCallback,
    SubProgramInit,
}					from './types.js';
import {
    print,
}					from './utils.js';
import agents_subprogram_init		from './agents.js';
import apps_subprogram_init		from './apps.js';
import interfaces_subprogram_init	from './interfaces.js';
import auth_subprogram_init		from './auth.js';
import grants_subprogram_init		from './grants.js';
import cells_subprogram_init		from './cells.js';
import dnas_subprogram_init		from './dnas.js';


//
// Utils
//
function increaseTotal ( v, total ) {
    return total + 1;
}


//
// Constants
//
const __dirname				= path.dirname( new URL( import.meta.url ).pathname );
const ROOT_DIR				= path.resolve( __dirname, "../.." );
const PACKAGE_DETAILS			= JSON.parse(
    await fs.readFile(
	path.resolve( ROOT_DIR, "package.json" ),
	"utf-8",
    )
);

// Program name derived from package.json
export const NAME			= PACKAGE_DETAILS.name;
// Program version derived from package.json
export const VERSION			= PACKAGE_DETAILS.version;



//
// Main
//
export async function main ( argv ) {
    const program			= new Command();

    // Global 'quiet' flag for runtime
    let quiet				= false;
    // Global 'verbosity' level for runtime
    let verbosity			= 0;

    let admin !: AdminClient;
    let output : any;

    function action_context ( action_callback : ActionCallback ) {
	return async function ( ...args ) {
	    // Ensure action results are used as the program output
	    output			= await action_callback.call( this, {
		log,
		admin,
	    }, ...args );
	};
    };

    async function auto_help () {
	if ( admin )
	    await (await admin.connection()).open();
	this.outputHelp();
    }

    function initialize_subcommand ( subprogram_init: SubProgramInit ) {
	subprogram_init( program, action_context, auto_help )
    }

    program
	.name( NAME )
	.version( VERSION )
	.configureHelp({
	    "showGlobalOptions": true,
	})
	.option("-v, --verbose", "increase logging verbosity", increaseTotal, 0 )
	.option("-q, --quiet", "suppress all printing except for final result", false )
	.option("-p, --admin-port <port>", "set the admin port for connecting to the Holochain Conductor", parseInt )
	.option("--origin <string>", "set the websocket origin value", "node" )
	.addOption(
	    (new Option(
		"-t, --timeout <number>",
		"set the default timeout for admin calls",
	    ))
		.argParser( parseInt )
		.default( 60_000, "60s" )
	)
	.hook("preAction", async function (self) {
	    const opts			= self.opts();

	    // Don't allow -q and -v
	    if ( opts.quiet && opts.verbose > 0 )
		throw new Error(`Don't use both --quite and --verbose in the same command; which one do you want?`);

	    // Only set the verbosity if a -v is present but start at 2 levels above
	    if ( opts.verbose > 0 ) {
		// Allow other 'program' functions to access the verbosity setting
		verbosity		= opts.verbose + 2
		// Verbosity setting controls logger level
		log.setLevel( verbosity );
		log.info(`Set logger verbosity to: %s (%s)`, verbosity, log.level_name );
	    }

	    if ( opts.quiet ) {
		// Allow other 'program' functions to access the quiet setting
		quiet			= true;
		// Tell print() to block writes
		print.quiet		= true;
		// Set logger to fatal even though it should still be set at that level
		log.setLevel( 0 );
	    }

	    // Setup the clients that all subcommands would use
	    admin			= new AdminClient( opts.adminPort, {
		"timeout":	opts.timeout,
                "ws_options": {
                    "origin":   opts.origin,
                },
	    });
	})
	// Control commander's output/error write behavior
	.configureOutput({
	    writeOut ( str ) {
		// Don't show commander messages if the the quiet flag was set
		if ( !quiet )
		    process.stdout.write( str );
	    },
	    writeErr ( str ) {
		// Don't show commander error messages if the logging is set to fatal
		if ( verbosity > 0 )
		    process.stdout.write(`\x1b[31m${str}\x1b[0m`);
	    },
	    outputError ( str, write ) {
		write(`\x1b[31m${str}\x1b[0m`);
	    },
	})
	// Prevent process exiting
	.exitOverride()
	// Force failure when unknown arguments are provided
	.allowExcessArguments( false )
	.action( auto_help );

    initialize_subcommand( agents_subprogram_init );
    initialize_subcommand( apps_subprogram_init );
    initialize_subcommand( interfaces_subprogram_init );
    initialize_subcommand( auth_subprogram_init );
    initialize_subcommand( grants_subprogram_init );
    initialize_subcommand( cells_subprogram_init );
    initialize_subcommand( dnas_subprogram_init );

    await program.parseAsync( argv );
    // At this point all subcommand actions have completed

    try {
	return output;
    } finally {
	await admin.close();
    }
}

if ( typeof process?.mainModule?.filename !== "string" ) {
    try {
	const output			= await main( process.argv );

	if ( !["", undefined].includes(output) ) {
	    if ( process.stdout.isTTY )
		print( json.debug(output) );
	    else
		console.log( JSON.stringify(output, null, 4) );
	}
    } catch (err) {
	if ( err.code?.startsWith("commander") ) {
	    if ( !(
		err.code.includes("helpDisplayed")
		|| err.code.includes("version")
	    ))
		console.log(`\x1b[31m${err.message}\x1b[0m`);
	}
	else
	    throw err;
    }
}


//
// Exports
//
export default {
    VERSION,
    main,
};
