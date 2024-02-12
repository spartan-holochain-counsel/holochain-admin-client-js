
import webpack			from 'webpack';
import TerserPlugin		from 'terser-webpack-plugin';


const MODE			= process.env.MODE || "development";
const FILENAME			= process.env.FILENAME || "holochain-admin-client";
const FILEEXT			= MODE === "production" ? "min.js" : "js";


export default {
    "target":	"web",
    "mode":	MODE,
    "entry": {
	"main": {
	    "import":	"./lib/index.js",
	    "filename":	`${FILENAME}.${FILEEXT}`,
	    "library": {
		"type":	"module",
	    },
	},
    },
    "resolve": {
	"mainFields": [ "module", "browser", "main" ],
    },
    "experiments": {
	"outputModule":	true,
    },
    "optimization": {
	"minimizer": [
	    new TerserPlugin({
		"terserOptions": {
		    "keep_classnames": true,
		},
	    }),
	],
    },
    "devtool":	"source-map",
    "stats": {
	"colors": true,
    },
    "plugins": [
        new webpack.optimize.LimitChunkCountPlugin({
	    "maxChunks": 1,
	}),
    ],
};
