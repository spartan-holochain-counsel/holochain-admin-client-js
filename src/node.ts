
import crypto				from 'crypto';

if ( global.crypto === undefined )
    global.crypto			= {} as any;

if ( global.crypto.subtle?.digest === undefined ) {
    if ( global.crypto.subtle === undefined )
	// @ts-ignore
	global.crypto.subtle		= {} as any;

    // @ts-ignore
    global.crypto.subtle.digest		= ( _, bytes: Uint8Array ) => {
	const hash			= crypto.createHash('sha512');
	hash.update( bytes );
	const digest			= hash.digest();
	return digest;
    };
}

import DefaultExports			from './index.js';

export *				from './index.js';
export default DefaultExports;
