
import crypto				from 'crypto';

global.crypto				= {
    "subtle": {
	digest ( _, bytes ) {
	    const hash			= crypto.createHash('sha512')
	    hash.update( bytes );
	    const digest		= hash.digest();
	    return digest;
	},
    },
};

import DefaultExports			from './index.js';

export *				from './index.js';
export default DefaultExports;
