[back to README.md](../README.md)


# API Reference for `AdminClient` class

## `new AdminClient( connection )`
A class for communicating with Conductor's Admin interface.

- `connection` - (*required*) either
  - an instance of [`Connection`](https://github.com/spartan-holochain-counsel/holochain-websocket-js/blob/master/docs/API_Connection.md)
  - or, it is used as the input for `new Connection( connection )`

Example
```javascript
const admin = new AdminClient( 12345 );
```

#### Static Properties

Status filters for `listApps()`
- `APPS_ENABLED` - get apps with status `Enabled`
- `APPS_DISABLED` - get apps with status `Disabled`
- `APPS_RUNNING` - get apps with status `Running`
- `APPS_STOPPED` - get apps with status `Stopped`
- `APPS_PAUSED` - get apps with status `Paused`


### `<AdminClient>.attachAppInterface( port ) -> Promise<object>`
Open a port where the Conductor's App Interface will listen for requests.

- `port` - (*optional*) the TCP port

Returns a Promise that resolves with the interface info

Example
```javascript
await admin.attachAppInterface();
// {
//     "port": 46487
// }
```

Example with specific port
```javascript
await admin.attachAppInterface( 45678 );
// {
//     "port": 45678
// }
```


### `<AdminClient>.addAdminInterface( port, allowed_origins ) -> Promise<undefined>`
Open a port where the Conductor's Admin Interface will listen for requests.

- `port` - (*required*) the TCP port
- `allowed_origins` - (*optional*) limit the origins that are allowed to connect
  - defaults to `*` (no limitations)

Returns a Promise that resolves when complete.

Example
```javascript
await admin.addAdminInterface( 58765 );
```


### `<AdminClient>.generateAgent() -> Promise<AgentPubKey>`
Create a new Agent in the Lair Keystore

Returns a Promise that resolves with the new `AgentPubKey`

Example
```javascript
await admin.generateAgent();
// AgentPubKey(39) [
//   132,  32,  36,  93, 157,  91,  70, 192,
//    29, 186,  89, 144, 229,  56, 240, 230,
//   179,  73,  61, 117, 238, 116,  69, 113,
//    50, 248, 106,  16, 195, 217, 180,  44,
//   178, 161, 236, 152, 235, 202, 199
// ]
```


### `<AdminClient>.registerDna( path, modifiers ) -> Promise<DnaHash>`
Register a DNA package.

- `path` - (*required*) file path or `DnaHash` for a DNA package
- `modifiers` - modifier options
  - `modifiers.network_seed` - a string to set a unique seed for a custom network space
    - defaults to `null`
  - `modifiers.properties` - an object containing cell properties
    - defaults to `null`
  - `modifiers.origin_time` - a timestamp to set the origin time for this DNA
    - defaults to `null`
  - `modifiers.quantum_time` - a pair of integers to set the quantum time for this DNA
    - defaults to `null`

Returns a Promise that resolves with the `DnaHash`

Example
```javascript
await admin.registerDna("./mere_memory.dna", {
    "network_seed": "something else",
    "properties": { "foo": "bar" },
    "origin_time": Date.now(),
    "quantum_time": [ 1, 2 ],
});
// DnaHash(39) [
//   132,  45,  36,  25,   6, 246, 151, 222,  37,
//   222, 187, 136, 196, 181, 162, 197,  76, 167,
//   100,   6, 228,  69, 215, 165,  11,  11, 224,
//    52,  98, 189, 155,  85, 193, 233, 186,  54,
//   227, 224,  62
// ]
```


### `<AdminClient>.installApp( app_id, agent_hash, path, options ) -> Promise<object>`
Create a new App installation for the given Agent using the given DNAs.

- `app_id` - (*required*) specify a unique ID for this installed App
  - `*` will generate a random hex ID
- `agent_hash` - (*required*) a 39 byte `Uint8Array` that is an `AgentPubKey`
- `path` - (*required*) file path for a app package
- `options` - optional input
  - `options.membrane_proof` - an object of key/values that correspond to
      - `key` - a DNA role name matching one in the app manifest
      - `value` - proof, if required by the DNA
  - `options.network_seed` - a string to set a unique seed for a custom network space
    - defaults to `null`

Returns a Promise that resolves with the installation details

Example
```javascript
const agent_hash = new HoloHash("uhCAkXZ1bRsAdulmQ5Tjw5rNJPXXudEVxMvhqEMPZtCyyoeyY68rH");

await admin.installApp( "my-app", agent_hash, "./memory.happ" );
// {
//     "installed_app_id": "my-app",
//     "status": {
//         "disabled": {
//             "reason": {
//                 "never_started": null
//             }
//         }
//     },
//     "roles": {
//         "memory": {
//             "name": "memory",
//             "cell_id": [ dna_hash, agent_hash ],
//             "dna_modifiers": {
//                 "network_seed": "",
//                 "properties": null,
//                 "origin_time": 1658361600000000,
//                 "quantum_time": {
//                     "secs": 300,
//                     "nanos": 0
//                 }
//             },
//             "provisioned": true,
//             "enabled": false
//             "cloned": [],
//         }
//     }
// }
```


### [deprecated] `<AdminClient>.activateApp( app_id ) -> Promise<undefined>`
Activate an installed App.

- `app_id` - (*required*) an installed App ID

Returns a Promise that resolves when complete.

Example
```javascript
await admin.activateApp( "my-app" );
```


### `<AdminClient>.enableApp( app_id ) -> Promise<object>`
Enable an installed App.

- `app_id` - (*required*) an installed App ID

Returns a Promise that resolves with the an object containing app info and a cell error list.

Example
```javascript
await admin.enableApp( "my-app" );
// {
//     "app": {
//         "installed_app_id": "my-app",
//         "status": {
//             "running": null
//         },
//         "roles": {
//             "memory": {
//                 "name": "memory",
//                 "cell_id": [ dna_hash, agent_hash ],
//                 "dna_modifiers": {
//                     "network_seed": "",
//                     "properties": null,
//                     "origin_time": 1658361600000000,
//                     "quantum_time": {
//                         "secs": 300,
//                         "nanos": 0
//                     }
//                 },
//                 "provisioned": true,
//                 "enabled": false
//                 "cloned": [],
//             }
//         }
//     },
//     "errors": []
// }
```


### `<AdminClient>.disableApp( app_id ) -> Promise<undefined>`
Disable an installed App.

- `app_id` - (*required*) an installed App ID

Returns a Promise that resolves when complete.

Example
```javascript
await admin.disableApp( "my-app" );
```


### `<AdminClient>.startApp( app_id ) -> Promise<bool>`
Disable an installed App.

- `app_id` - (*required*) an installed App ID

Returns a Promise that resolves with a boolean success indicator.

Example
```javascript
await admin.disableApp( "my-app" );
```


### `<AdminClient>.createCloneCell( app_id, role_name, dna_hash, agent_pubkey, options ) -> Promise<object>`
Disable an installed App.

- `app_id` - (*required*) an installed App ID
- `role_name` - (*required*) an installed App's role name
- `dna_hash` - (*required*) a DNA hash
- `agent_pubkey` - (*required*) an Agent hash
- `options` - optional input
  - `options.properties` - object containing cell properties
    - defaults to `null`
  - `options.membrane_proof` - proof, if required by the DNA
    - defaults to `null`

Returns a Promise that resolves with the cell ID.

Example
```javascript
await admin.createCloneCell( "my-app", "memory", dna_hash, agent_pubkey );
```


### `<AdminClient>.listDnas() -> Promise<array<DnaHash>>`
Get the list of registered DNAs.

Returns a Promise that resolves with the list of DNA hashes

Example
```javascript
await admin.listDnas();
// [
//     DnaHash(39) [
//       132,  45,  36,  25,   6, 246, 151, 222,  37,
//       222, 187, 136, 196, 181, 162, 197,  76, 167,
//       100,   6, 228,  69, 215, 165,  11,  11, 224,
//        52,  98, 189, 155,  85, 193, 233, 186,  54,
//       227, 224,  62
//     ],
// ]
```


### `<AdminClient>.listCells() -> Promise<array<(DnaHash, AgentPubKey)>>`
Get the list of cells.

Returns a Promise that resolves with the list of cell IDs

Example
```javascript
await admin.listCells();
// [
//     [
//         DnaHash(39) [
//           132,  45,  36,  25,   6, 246, 151, 222,  37,
//           222, 187, 136, 196, 181, 162, 197,  76, 167,
//           100,   6, 228,  69, 215, 165,  11,  11, 224,
//            52,  98, 189, 155,  85, 193, 233, 186,  54,
//           227, 224,  62
//         ],
//         AgentPubKey(39) [
//           132,  32,  36,  93, 157,  91,  70, 192,
//            29, 186,  89, 144, 229,  56, 240, 230,
//           179,  73,  61, 117, 238, 116,  69, 113,
//            50, 248, 106,  16, 195, 217, 180,  44,
//           178, 161, 236, 152, 235, 202, 199
//         ],
//     ],
// ]
```


### `<AdminClient>.listApps( status ) -> Promise<array<string>>`
Get the list of installed Apps.

- `status` - (*optional*) filter by app status (see [static properties](#static-properties) for options)
  - defaults to `APPS_RUNNING`

Returns a Promise that resolves with the list of app info objects

Example
```javascript
await admin.listApps();
// [
//     {
//         "installed_app_id": "my-app",
//         "status": {
//             "running": null
//         },
//         "roles": {
//             "memory": {
//                 "name": "memory",
//                 "cell_id": [ dna_hash, agent_hash ],
//                 "dna_modifiers": {
//                     "network_seed": "",
//                     "properties": null,
//                     "origin_time": 1658361600000000,
//                     "quantum_time": {
//                         "secs": 300,
//                         "nanos": 0
//                     }
//                 },
//                 "provisioned": true,
//                 "enabled": false
//                 "cloned": [],
//             }
//         }
//     }
// ]
```

Example of filtering
```javascript
await admin.listApps( admin.constructor.APPS_DISABLED );
```


### `<AdminClient>.listAppInterfaces() -> Promise<array<number>>`
Get the list of app interfaces.

Returns a Promise that resolves with the list of TCP ports

Example
```javascript
await admin.listAppInterfaces();
// [
//     46487,
//     45678,
// ]
```


### `<AdminClient>.listActiveAgents() -> Promise<array<AgentPubKey>>`
Get the list of active Agents.

Returns a Promise that resolves with the list of Agent pubkeys

Example
```javascript
await admin.listActiveAgents();
// [
//     AgentPubKey(39) [
//       132,  32,  36,  93, 157,  91,  70, 192,
//        29, 186,  89, 144, 229,  56, 240, 230,
//       179,  73,  61, 117, 238, 116,  69, 113,
//        50, 248, 106,  16, 195, 217, 180,  44,
//       178, 161, 236, 152, 235, 202, 199
//     ],
// ]
```


### `<AdminClient>.cellState( dna_hash, agent_hash, start, end ) -> Promise<object>`
Get the full state dump for a specific cell.

- `dna_hash` - (*required*) a 39 byte `Uint8Array` that is a registered `DnaHash`
- `agent_hash` - (*required*) a 39 byte `Uint8Array` that is a `AgentPubKey`
- `start` - (*optional*) the start number used to slice the source chain records
- `end` - (*optional*) the end number used to slice the source chain records

Returns a Promise that resolves with the state dump response

Example
```javascript
await admin.cellState( dna_hash, agent_hash );
{
    "integration_dump": {
        "validation_limbo": 0,
        "integration_limbo": 0,
        "integrated": 15
    },
    "kitsune": {
        "agent": Uint8Array { 7, 101, 137 ... 83, 65, 31 },
        "space": Uint8Array { 169, 104, 195 ... 122, 104, 135 }
    },
    "cell": {
        "agent": new AgentPubKey("uhCAkB2WJ6MDICYuakSxNbWm2yzf93WQLMHwbAJksVu2uFTD9U0Ef"),
        "dna": new DnaHash("uhC0kqWjDntQ1RSseTq5bn5U7Lv102V2iLnqnmIs-RxMtdRXCemiH")
    },
    "peers": [],
    "published_ops_count": 15,
    "source_chain": [
        {
            "signature": Uint8Array { 147, 39, 135 ... 4, 74, 245 ... 14 more bytes },
            "action_address": new ActionHash("uhCkkqfbahbSj7uMfVgiaTX5VONUWBycfy5qPKPRgrgbbGfqkTvrr"),
            "action": {
                "type": "Create",
                "author": new AgentPubKey("uhCAkB2WJ6MDICYuakSxNbWm2yzf93WQLMHwbAJksVu2uFTD9U0Ef"),
                "timestamp": [
                    1631125015,
                    117028920
                ],
                "action_seq": 5,
                "prev_action": new ActionHash("uhCkk6FU6LNO3nEnrqkI-tBUf_Wgyld7cRx3sAbm--CMIebAqAYbF"),
                "entry_type": {
                    "App": {
                        "id": 0,
                        "zome_id": 0,
                        "visibility": "Public"
                    }
                },
                "entry_hash": new EntryHash("uhCEkkwVTvJuqKRtskO1CQakx51_WP86HZeCTeu6zuWqyZXUr9IhY")
            },
            "entry": {
                "entry_type": "App",
                "entry": {
                    "author": Uint8Array { 132, 32, 36 ... 83, 65, 31 },
                    "published_at": 1631125015115,
                    "memory_size": 21,
                    "block_addresses": [
                        Uint8Array { 132, 33, 36 ... 165, 75, 52 }
                    ]
                }
            }
        },
    ],
    ...
}
```


### `<AdminClient>.requestAgentInfo( cell_id ) -> Promise<array<object>>`
Get a list of agent-info objects.

- `cell_id` - (*optional*) filter by cell ID (eg. `[ DnaHash, AgentPubKey ]`)
  - defaults to `null` to get all agents

Returns a Promise that resolves with the list of objects

Example
```javascript
await admin.requestAgentInfo();
// [
//     {
//         "agent": new AgentPubKey("uhCAkB2WJ6MDICYuakSxNbWm2yzf93WQLMHwbAJksVu2uFTD9U0Ef"),
//         "signature": Uint8Array { 181, 227, 182 ... 129, 137, 118 ... 14 more bytes },
//         "agent_info": {
//             "space": Uint8Array { 169, 104, 195 ... 122, 104, 135 },
//             "agent": Uint8Array { 65, 242, 107 ... 246, 230, 51 },
//             "urls": [
//                 "kitsune-quic://192.168.0.62:35756"
//             ],
//             "signed_at_ms": 1631139896037,
//             "expires_after_ms": 1200000,
//             "meta_info": {
//                 "dht_storage_arc_half_length": 0
//             }
//         }
//     }
// ]
```

### `<AdminClient>.grantCapability( tag, agent, dna, functions, secret, assignees ) -> Promise<true>`
Create one of the capability grants based on the number of arguments provided.

Required arguments
- `tag`
- `agent`
- `dna`
- `functions`

Optional argument logic
- If a `secret` and `assignees` are provided, `grantAssignedCapability` is called.
- If a `secret` is provided, `grantTransferableCapability` is called.
- Otherwise, `grantUnrestrictedCapability` is called.


### `<AdminClient>.grantUnrestrictedCapability( tag, agent, dna, functions ) -> Promise<true>`
Create an unrestricted capability grant.

- `tag` - (*required*) a string (is not required to be unique)
- `agent` - (*required*) a 39 byte `Uint8Array` used as the `AgentPubKey` of the cell ID
- `dna` - (*required*) a 39 byte `Uint8Array` used as the `DnaHash` of the cell ID
- `functions` - (*required*) specified zome(s) and function(s) or the wildcard for all
  - eg. wildcard `*`
  - eg. paired as an array `[ [ "zome_name", "function_name" ], ... ]`
  - eg. object lists `{ "zome_name": [ "function_name" ] }`

Returns a Promise that resolves with `true`

Example
```javascript
const agent_hash = new HoloHash("uhCAkXZ1bRsAdulmQ5Tjw5rNJPXXudEVxMvhqEMPZtCyyoeyY68rH");
const dna_hash = new HoloHash("uhC0kGQb2l94l3ruIxLWixUynZAbkRdelCwvgNGK9m1XB6bo24-A-");

await admin.grantCapability( "tag-name", agent_hash, dna_hash, [
    [ "zome_name", "fn_name" ],
]);
// true
```


### `<AdminClient>.grantTransferableCapability( tag, agent, dna, functions, secret ) -> Promise<true>`
Create a transferable capability grant.

- `tag` - (*required*) a string (is not required to be unique)
- `agent` - (*required*) a 39 byte `Uint8Array` used as the `AgentPubKey` of the cell ID
- `dna` - (*required*) a 39 byte `Uint8Array` used as the `DnaHash` of the cell ID
- `functions` - (*required*) specified zome(s) and function(s) or the wildcard for all
  - eg. wildcard `*`
  - eg. paired as an array `[ [ "zome_name", "function_name" ], ... ]`
  - eg. object lists `{ "zome_name": [ "function_name" ] }`
- `secret` - (*required*) a string

Returns a Promise that resolves with `true`

Example
```javascript
const agent_hash = new HoloHash("uhCAkXZ1bRsAdulmQ5Tjw5rNJPXXudEVxMvhqEMPZtCyyoeyY68rH");
const dna_hash = new HoloHash("uhC0kGQb2l94l3ruIxLWixUynZAbkRdelCwvgNGK9m1XB6bo24-A-");

await admin.grantCapability( "tag-name", agent_hash, dna_hash, [
    [ "zome_name", "fn_name" ],
], "super_secret_password" );
// true
```


### `<AdminClient>.grantAssignedCapability( tag, agent, dna, functions, secret, assignees ) -> Promise<true>`
Create an assigned capability grant.

- `tag` - (*required*) a string (is not required to be unique)
- `agent` - (*required*) a 39 byte `Uint8Array` used as the `AgentPubKey` of the cell ID
- `dna` - (*required*) a 39 byte `Uint8Array` used as the `DnaHash` of the cell ID
- `functions` - (*required*) specified zome(s) and function(s) or the wildcard for all
  - eg. wildcard `*`
  - eg. paired as an array `[ [ "zome_name", "function_name" ], ... ]`
  - eg. object lists `{ "zome_name": [ "function_name" ] }`
- `secret` - (*required*) a string
- `assignees` - (*required*) a list of agents (39 byte `Uint8Array`)

Returns a Promise that resolves with `true`

Example
```javascript
import nacl from 'tweetnacl';

const key_pair = nacl.sign.keyPair();

const agent_hash = new HoloHash("uhCAkXZ1bRsAdulmQ5Tjw5rNJPXXudEVxMvhqEMPZtCyyoeyY68rH");
const dna_hash = new HoloHash("uhC0kGQb2l94l3ruIxLWixUynZAbkRdelCwvgNGK9m1XB6bo24-A-");

await admin.grantCapability( "tag-name", agent_hash, dna_hash, [
    [ "zome_name", "fn_name" ],
], "super_secret_password", [
    new AgentPubKey( key_pair.publicKey )
] );
// true
```


### `<AdminClient>.close() -> Promise<>`
Initiate closing this client's connection.

Returns a Promise that resolves when the Connection has closed.



## Module exports
```javascript
{
    AdminClient,
    DeprecationNotice,
    sha512,

    // Forwarded from @spartan-hc/holochain-websocket
    HolochainWebsocket,
}
```
