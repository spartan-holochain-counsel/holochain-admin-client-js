import { Logger }			from '@whi/weblogger';
const log				= new Logger("test-basic", process.env.LOG_LEVEL );

import why				from 'why-is-node-running';

import path				from 'path';
import { expect }			from 'chai';
import nacl				from 'tweetnacl';

import { Holochain }			from '@whi/holochain-backdrop';
import json				from '@whi/json';

import { expect_reject }		from './utils.js';

import HolochainAdminClient		from '../../src/index.js';
import {
    AdminClient,

    HoloHash,
    AgentPubKey,

    ConductorError,
}					from '../../src/index.js';


const TEST_DNA_PATH			= new URL( "../packs/memory.dna", import.meta.url ).pathname;
const TEST_HAPP_PATH			= new URL( "../packs/storage.happ", import.meta.url ).pathname;
const TEST_HAPP_CLONES_PATH		= new URL( "../packs/storage_with_clones.happ", import.meta.url ).pathname;
const TEST_APP_ID			= "test-app";
const TEST_APP_CLONES_ID		= `${TEST_APP_ID}-clones`;

let conductor;
let admin;
let dna_hash, dna2_hash;
let agent_hash;
let app_port;


function basic_tests () {
    it("should attach app interface", async function () {
	let resp			= await admin.attachAppInterface();
	log.info("Attach App Interface response: %s", resp );
	app_port			= resp.port;
    });

    it("should add admin interface", async function () {
	let resp			= await admin.addAdminInterface( 58_765 );
	log.info("Add Admin Interface response: %s", resp );
    });

    it("should generate agent", async function () {
	agent_hash			= await admin.generateAgent();
	log.normal("Agent response: %s", agent_hash );
    });

    it("should install app", async function () {
	let installation		= await admin.installApp( `${TEST_APP_ID}`, agent_hash, TEST_HAPP_PATH, {
	    "network_seed": Math.random().toString(),
	});
	log.normal("Installed app '%s' [status: %s]", installation.installed_app_id, installation.status );

	Object.entries( installation.roles ).forEach( ([role_name, role]) => {
	    log.trace("  %s => %s (provisioned: %s, enabled: %s)", () => [
		role_name.padEnd(15), role.cell_id, role.provisioned, role.enabled,
	    ]);
	});

	expect( installation.roles.storage.provisioned	).to.be.true;
	expect( installation.running			).to.be.false;

	dna_hash			= installation.roles.storage.cell_id[0];

	{
	    let app_info		= await admin.installApp( "*", agent_hash, TEST_HAPP_PATH );

	    expect( app_info.installed_app_id ).to.have.length( 8 );
	}
    });

    it("should install app with clones", async function () {
	let app_info			= await admin.installApp( TEST_APP_CLONES_ID, agent_hash, TEST_HAPP_CLONES_PATH, {
	    "network_seed": Math.random().toString(),
	});
	log.normal("Installed app '%s' [state: %s]", app_info.installed_app_id, app_info.status );

	expect( app_info.installed_app_id	).to.equal( TEST_APP_CLONES_ID );
    });

    it("should enable app", async function () {
	const resp			= await admin.enableApp( TEST_APP_ID );

	log.normal("Enabled app: %s", resp );
    });

    it("should list DNAs", async function () {
	const dnas			= await admin.listDnas();

	expect( dnas			).to.have.length( 3 );
	expect( dnas.map(String)	).to.include( dna_hash.toString() );
    });

    it("should register DNAs", async function () {
	const dna_hash			= await admin.registerDna( TEST_DNA_PATH );
	log.normal("Register response: %s", dna_hash );

	const mod1_hash			= await admin.registerDna( TEST_DNA_PATH, {
	    "network_seed": "something else",
	});

	log.normal("Register response: %s", mod1_hash );
	expect( mod1_hash		).to.not.deep.equal( dna_hash );

	const mod2_hash			= await admin.registerDna( TEST_DNA_PATH, {
	    "network_seed": "something else",
	    "properties": { "foo": "bar" },
	});

	log.normal("Register response: %s", mod2_hash );
	expect( mod2_hash		).to.not.deep.equal( mod1_hash );

	const mod3_hash			= await admin.registerDna( TEST_DNA_PATH, {
	    "network_seed": "something else",
	    "properties": { "foo": "bar" },
	    "origin_time": Date.now(),
	});

	log.normal("Register response: %s", mod3_hash );
	expect( mod3_hash		).to.not.deep.equal( mod2_hash );

	const mod4_hash			= await admin.registerDna( TEST_DNA_PATH, {
	    "network_seed": "something else",
	    "properties": { "foo": "bar" },
	    "origin_time": Date.now(),
	    "quantum_time": [ 1, 2 ],
	});

	log.normal("Register response: %s", mod4_hash );
	expect( mod4_hash		).to.not.deep.equal( mod3_hash );

	const dnas			= await admin.listDnas();

	expect( dnas			).to.have.length( 7 );
    });

    it("should list cells", async function () {
	const cells			= await admin.listCells();

	expect( cells			).to.have.length( 1 );
    });

    it("should list apps", async function () {
	const apps			= await admin.listApps();

	expect( apps				).to.have.length( 1 );
	expect( apps[0].installed_app_id	).to.equal( TEST_APP_ID );

	{
	    const filtered_apps		= await admin.listApps( admin.constructor.APPS_ENABLED );

	    expect( filtered_apps	).to.have.length( 1 );
	}

	{
	    const filtered_apps		= await admin.listApps( admin.constructor.APPS_DISABLED );

	    expect( filtered_apps	).to.have.length( 2 );
	}

	{
	    const filtered_apps		= await admin.listApps( admin.constructor.APPS_STOPPED );

	    expect( filtered_apps	).to.have.length( 2 );
	}

	{
	    const filtered_apps		= await admin.listApps( admin.constructor.APPS_PAUSED );

	    expect( filtered_apps	).to.have.length( 0 );
	}
    });

    it("should list app interfaces", async function () {
	const ifaces			= await admin.listAppInterfaces();

	expect( ifaces			).to.have.length( 1 );
	expect( ifaces[0]		).to.be.a("number");
    });

    it("should list agents", async function () {
	const agents			= await admin.listAgents();

	expect( agents			).to.have.length( 1 );
	expect( agents[0]		).to.deep.equal( agent_hash );
    });

    it("should request agent info", async function () {
	const agents			= await admin.requestAgentInfo();

	expect( agents			).to.have.length( 1 );
	expect( agents[0].agent		).to.deep.equal( agent_hash );
    });

    it("should get cell state", async function () {
	const state			= await admin.cellState( dna_hash, agent_hash );

	// log.trace("Cell state dump => %s", json.debug( state ) );

	expect( state.source_chain	).to.have.length.gte( 2 );
    });

    it("should get agent info", async function () {
	const agent_info		= await admin.requestAgentInfo([ dna_hash, agent_hash ]);

	// log.trace("Cell agent info => %s", json.debug( agent_info ) );

	expect( agent_info[0].agent	).to.deep.equal( agent_hash );
    });

    it("should grant assigned capability", async function () {
	const key_pair			= nacl.sign.keyPair();
	const succeeded			= await admin.grantCapability( "tag-name", agent_hash, dna_hash, "*", "super_secret_password", [
	    new AgentPubKey( key_pair.publicKey )
	]);

	expect( succeeded		).to.be.true;
    });

    it("should grant transferable capability", async function () {
	const succeeded			= await admin.grantCapability( "tag-name", agent_hash, dna_hash, "*", "super_secret_password" );

	expect( succeeded		).to.be.true;
    });

    it("should grant unrestricted capability", async function () {
	const succeeded			= await admin.grantCapability( "tag-name", agent_hash, dna_hash, "*" );

	expect( succeeded		).to.be.true;
    });

    it("should grant unrestricted capability for specific functions array", async function () {
	const succeeded			= await admin.grantCapability( "tag-name", agent_hash, dna_hash, [
	    [ "mere_memory", "save_bytes" ],
	]);

	expect( succeeded		).to.be.true;
    });

    it("should grant unrestricted capability for specific functions object", async function () {
	const succeeded			= await admin.grantCapability( "tag-name", agent_hash, dna_hash, {
	    "mere_memory": [ "save_bytes" ],
	});

	expect( succeeded		).to.be.true;
    });

    it("should disable app", async function () {
	const resp			= await admin.disableApp( TEST_APP_ID );
	log.normal("Disabled app: %s", resp );
    });

    it("should list apps after", async function () {
	const apps			= await admin.listApps();

	expect( apps				).to.have.length( 0 );

	{
	    const filtered_apps		= await admin.listApps( admin.constructor.APPS_ENABLED );

	    expect( filtered_apps	).to.have.length( 0 );
	}

	{
	    const filtered_apps		= await admin.listApps( admin.constructor.APPS_DISABLED );

	    expect( filtered_apps	).to.have.length( 3 );
	}

	{
	    const filtered_apps		= await admin.listApps( admin.constructor.APPS_STOPPED );

	    expect( filtered_apps	).to.have.length( 3 );
	}

	{
	    const filtered_apps		= await admin.listApps( admin.constructor.APPS_PAUSED );

	    expect( filtered_apps	).to.have.length( 0 );
	}
    });

    it("should uninstall app", async function () {
	const resp			= await admin.uninstallApp( TEST_APP_ID );
	log.normal("Uninstalled app: %s", resp );
    });
}

function errors_tests () {
    it("should call admin API method with invalid args", async function () {
	await expect_reject( async () => {
	    await admin.attachAppInterface( 1 );
	}, ConductorError, "Permission denied" );
    });

    it("should fail to add admin interface", async function () {
	await expect_reject( async () => {
	    await admin.addAdminInterface( app_port );
	}, ConductorError, "Address already in us" );
    });

    // register: non-existent DNA path
    it("should fail to register because bad path", async function () {
	await expect_reject( async () => {
	    await admin.registerDna( "./non-existent.dna" );
	}, ConductorError, "No such file or directory" );
    });

    // activate: non-existent app ID
    it("should fail to enable because invalid app ID", async function () {
	await expect_reject( async () => {
	    await admin.enableApp( "invalid-app-id" );
	}, ConductorError, "AppNotInstalled" );
    });

    it("should fail to create cap grant because bad input", async function () {
	await expect_reject( async () => {
	    await admin.grantCapability( "?", agent_hash, dna_hash );
	}, TypeError, "Invalid granted functions input" );

	await expect_reject( async () => {
	    await admin.grantCapability( "?", agent_hash, dna_hash, { "zome": {}, });
	}, TypeError, "Invalid granted functions object; functions must" );

	await expect_reject( async () => {
	    await admin.grantCapability( "?", agent_hash, dna_hash, { "zome": [ null ], });
	}, TypeError, "Invalid granted functions object; function name" );
    });
}

describe("Integration: Admin Client", () => {

    before(async () => {
	conductor			= new Holochain({
	    "default_loggers": process.env.LOG_LEVEL === "trace",
	});

	await conductor.start();

	const port			= conductor.adminPorts()[0];

	admin				= new AdminClient( port );
    });

    describe("Basic",		basic_tests );
    describe("Errors",		errors_tests );

    after(async () => {
	if ( admin ) {
	    await admin.close();
	    log.trace("%s => Connection is closed", admin.toString() );
	}

	await conductor.destroy();

	// setTimeout( () => why(), 1000 );
    });

});
