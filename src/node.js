
import crypto				from 'crypto';

if ( global.crypto === undefined )
    global.crypto			= {};

if ( global.crypto.subtle?.digest === undefined ) {
    if ( global.crypto.subtle === undefined )
	global.crypto.subtle		= {};

    global.crypto.subtle.digest		= ( _, bytes ) => {
	const hash			= crypto.createHash('sha512');
	hash.update( bytes );
	const digest			= hash.digest();
	return digest;
    };
}

import DefaultExports			from './index.js';

export *				from './index.js';
export default DefaultExports;
