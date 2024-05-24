
import {
    DnaHash,
}					from '@spartan-hc/holo-hash';


type RegisterOpts = {
    network_seed       ?: string;
    properties	       ?: any;
    origin_time	       ?: (number | string);
    quantum_time       ?: [ number, number ];
};


export default function ( program, action_context, auto_help ) {
    const subprogram			= program
	.command("dnas")
	.description("Manage DNAs")
	.action( auto_help );

    subprogram
	.command("list")
	.description("List DNAs")
	.action(
	    action_context(async function ({ log, admin }) {
		const opts		= this.opts();
		const dnas		= await admin.listDnas();

		return dnas;
	    })
	);

    subprogram
	.command("register")
	.description("Register DNA")
	.argument("<source>", "Path to DNA or DNA hash")
	.option("-n, --network-seed <string>", "network seed DNA modifier")
	// -p is already used for 'port'
	.option("--properties <string>", "properties DNA modifier as JSON")
	// Not using a short-code for consistency
	.option("--origin-time <string>", "origin time DNA modifier")
	// -q is already used for quiet
	.option("--quantum-time <string>", "quantum time DNA modifier (eg. '<number>:<number>')")
	.action(
	    action_context(async function ({ log, admin }, dna_src ) {
		const opts		= this.opts();
		console.log( opts )
		const register_opts 	= {} as RegisterOpts;

		if ( opts.networkSeed )
		    register_opts.network_seed	= opts.networkSeed;
		if ( opts.properties )
		    register_opts.properties	= JSON.parse( opts.properties );
		if ( opts.originTime ) {
		    try {
			// Check if origin time is a timestamp
			register_opts.origin_time	= parseInt( opts.originTime );
		    } catch (err) {
			// Origin time must be a date string
			register_opts.origin_time	= opts.originTime;
		    }
		}
		if ( opts.quantumTime )
		    register_opts.quantum_time	= opts.quantumTime.split(":").map( n => parseInt(n) );

		try {
		    dna_src		= new DnaHash( dna_src );
		} finally {
		    // DNA source must be a file path
		}

		console.log({
		    dna_src,
		    register_opts,
		})
		const dna_hash		= await admin.registerDna(
		    dna_src,
		    register_opts,
		);

		return dna_hash;
	    })
	);

    subprogram
	.command("definition")
	.description("Get DNA definition")
	.argument("<dna>", "DNA hash")
	.action(
	    action_context(async function ({ log, admin }, dna_hash ) {
		const opts		= this.opts();
		const dna_def		= await admin.getDnaDefinition(
		    new DnaHash( dna_hash ),
		);

		return dna_def;
	    })
	);

    return subprogram;
}
