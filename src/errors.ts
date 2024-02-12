
import { set_tostringtag }		from './utils.js';

export class CustomError extends Error {
    static [Symbol.toPrimitive] ( hint ) {
	return hint === "number" ? null : `[${this.name} {}]`;
    }

    constructor( ...params ) {
	super( ...params );

	if (Error.captureStackTrace) {
	    Error.captureStackTrace(this, this.constructor);
	}

	this.name			= this.constructor.name;
    }

    [Symbol.toPrimitive] ( hint ) {
	return hint === "number" ? null : this.toString();
    }

    toString () {
	return `[${this.constructor.name}( ${this.message} )]`;
    }

    toJSON ( debug = false ) {
	return {
	    "error":	this.name,
	    "message":	this.message,
	    "stack":	debug === true
		? typeof this.stack === "string" ? this.stack.split("\n") : this.stack
		: undefined,
	};
    }
}
set_tostringtag( CustomError );

export class DeprecationNotice extends CustomError {}
set_tostringtag( DeprecationNotice );
