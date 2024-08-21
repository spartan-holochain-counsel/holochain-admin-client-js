import * as msgpack                     from '@msgpack/msgpack';
import { Bytes }			from '@whi/bytes-class';
import {
    AgentPubKey, DnaHash,
    ActionHash, EntryHash,
    AnyLinkableHash,
}                                       from '@spartan-hc/holo-hash';
import {
    intoStruct,
    AnyType, OptionType,
    VecType, MapType,
}					from '@whi/into-struct';


function AnyLinkableHashArray ( arr ) {
    return new AnyLinkableHash( new Uint8Array(arr) );
}
function DnaHashArray ( arr ) {
    return new DnaHash( new Uint8Array(arr) );
}
function ActionHashArray ( arr ) {
    return new ActionHash( new Uint8Array(arr) );
}
function EntryHashArray ( arr ) {
    return new EntryHash( new Uint8Array(arr) );
}
function AgentPubKeyArray ( arr ) {
    return new AgentPubKey( new Uint8Array(arr) );
}


function normalize_enum_struct ( data, tag = "type" ) {
    if ( typeof data === "string" ) {
        return {
            [data]: null,
        };
    }

    if ( typeof data[ tag ] === "string" ) {
        const enum_type                 = data[ tag ];

        return {
            [enum_type]: data,
        };
    }

    if ( Object.keys( data ).length > 1 )
        throw new TypeError(`Enum struct should only have 1 key; too many keys: ${Object.keys( data ).join(", ")}`);

    const type_name                     = Object.keys( data )[0];

    if ( typeof data[ type_name ] !== "object" )
        throw new TypeError(`Expected enum content to be an object; not type '${typeof data[ type_name ]}'`);

    return data;
}


export const Signature                  = Bytes;


export function EntryTypeEnum ( data ) {
    data                                = normalize_enum_struct( data, "entry_type" );

    if ( "App" in data )
        return intoStruct( data, AppEntryTypeStruct );
    if ( "AgentPubKey" in data )
        return "AgentPubKey";
    if ( "CapClaim" in data )
        return "CapClaim";
    if ( "CapGrant" in data )
        return "CapGrant";

    throw new Error(`Unhandled Action entry type: ${Object.keys(data)[0]}`);
}

export const AppEntryTypeStruct         = {
    "App": {
        "entry_index":          Number,
        "zome_index":           Number,
        "visibility":           AnyType,
    },
};

export const WeightStruct               = {
    "bucket_id":                Number,
    "units":                    Number,
    "rate_bytes":               OptionType( Number ),
};

export const ActionBaseStruct           = {
    "author":                   AgentPubKeyArray,
    "timestamp":                Number,
    "action_seq":               Number,
    "prev_action":              OptionType( ActionHashArray ),
}
export const DnaActionStruct            = {
    // "type":                     "Dna",
    "author":                   AgentPubKeyArray,
    "timestamp":                Number,
    "hash":                     DnaHashArray,
};
export const AgentValidationPkgActionStruct = {
    // "type":                     "AgentValidationPkg",
    ...ActionBaseStruct,
    "membrane_proof":           OptionType( Bytes ),
};
export const NativeCreateActionStruct   = {
    // "type":                     "Create",
    ...ActionBaseStruct,
    "entry_type":               String,
    "entry_hash":               EntryHashArray,
    "weight":                   WeightStruct,
};
export const InitZomesCompleteActionStruct = {
    // "type":                     "InitZomesComplete",
    ...ActionBaseStruct,
};
export const CreateActionStruct         = {
    // "type":                     "Create",
    ...ActionBaseStruct,
    "entry_type":               EntryTypeEnum,
    "entry_hash":               EntryHashArray,
    "weight":                   WeightStruct,
};
export const UpdateActionStruct         = {
    // "type":                     "Update",
    ...ActionBaseStruct,
    "original_action_address":  ActionHashArray,
    "original_entry_address":   EntryHashArray,
    "entry_type":               EntryTypeEnum,
    "entry_hash":               EntryHashArray,
    "weight":                   WeightStruct,
};
export const DeleteActionStruct         = {
    // "type":                     "Delete",
    ...ActionBaseStruct,
    "deletes_address":          ActionHashArray,
    "deletes_entry_address":    EntryHashArray,
    "weight":                   WeightStruct,
};

export const CreateLinkActionStruct     = {
    // "type":                     "CreateLink",
    ...ActionBaseStruct,
    "base_address":             AnyLinkableHashArray,
    "target_address":           AnyLinkableHashArray,
    "zome_index":               Number,
    "link_type":                Number,
    "tag":                      Bytes,
    "weight":                   WeightStruct,
};

export const DeleteLinkActionStruct     = {
    // "type":                     "DeleteLink",
    ...ActionBaseStruct,
    "base_address":             AnyLinkableHashArray,
    "link_add_address":         ActionHashArray,
};

export function ActionEnum ( data ) {
    data                                = normalize_enum_struct( data );

    if ( "Dna" in data )
        return {
            Dna: intoStruct( data.Dna, DnaActionStruct ),
        };
    if ( "AgentValidationPkg" in data )
        return {
            AgentValidationPkg: intoStruct( data.AgentValidationPkg, AgentValidationPkgActionStruct ),
        };
    if ( "InitZomesComplete" in data )
        return {
            InitZomesComplete: intoStruct( data.InitZomesComplete, InitZomesCompleteActionStruct ),
        };
    if ( "Create" in data ) {
        return {
            Create: intoStruct(
                data.Create,
                typeof data.entry_type === "string" ?
                    NativeCreateActionStruct
                    : CreateActionStruct
            ),
        };
    }
    if ( "Update" in data )
        return {
            Update: intoStruct( data.Update, UpdateActionStruct ),
        };
    if ( "Delete" in data )
        return {
            Delete: intoStruct( data.Delete, DeleteActionStruct ),
        };
    if ( "CreateLink" in data )
        return {
            CreateLink: intoStruct( data.CreateLink, CreateLinkActionStruct ),
        };
    if ( "DeleteLink" in data )
        return {
            DeleteLink: intoStruct( data.DeleteLink, DeleteLinkActionStruct ),
        };

    throw new Error(`Unhandled Action type: ${data.type}`);
}


export const SignedActionStruct         = {
    "hashed": {
        "content":              ActionEnum,
        "hash":                 ActionHashArray,
    },
    "signature":                Signature,
};

export function SignedAction ( data ) {
    return intoStruct( data, SignedActionStruct );
}


export function EntryEnum ( data ) {
    // console.log("EntryEnum:", data );

    switch (data.entry_type) {
        case "Agent":
            data.content                = new AgentPubKey( new Uint8Array(data.entry) );
            break;
        case "App":
            data.content                = msgpack.decode( data.entry );
            break;
        case "CapGrant":
            data.content                = null;
            break;
        case "CapClaim":
            data.content                = null;
            break;
        case "CapGrant":
            data.content                = null;
            break;
        default:
            throw new TypeError(`Unhandled entry type '${data.entry_type}'`);
            break;
    }

    return data;
}

export async function query_whole_chain () {
    const result                    = await this.call();

    return result.map( record => {
        record.signed_action        = SignedAction(record.signed_action);
        record.entry                = EntryEnum(record.entry);

        return record;
    });
}

export const KitsuneSpace           = Bytes;
export const KitsuneAgent           = Bytes;

export const AgentInfoDumpStruct    = {
    "kitsune_agent":        KitsuneAgent,
    "kitsune_space":        KitsuneSpace,
    "dump":                 String,
};
export const PeerDumpStruct         = {
    "this_agent_info":      OptionType( AgentInfoDumpStruct ),
    "this_dna":             OptionType([ DnaHashArray, KitsuneSpace ]),
    "this_agent":           OptionType([ AgentPubKeyArray, KitsuneAgent ]),
    "peers":                VecType( AgentInfoDumpStruct ),
};

export const EntryStruct            = AnyType;
export const SourceChainDumpRecordStruct = {
    "signature":            Signature,
    "action_address":       ActionHashArray,
    "action":               ActionEnum,
    "entry":                OptionType( EntryEnum ),
};
export const SourceChainDumpStruct  = {
    "records":              VecType( SourceChainDumpRecordStruct ),
    "published_ops_count":  Number,
};

export class RecordEntryEnum {
    #data                       : any;

    constructor ( data ) {
        // console.log("RecordEntryEnum:", data );
        this.#data                  = data;
    }

    toJSON () {
        if ( typeof this.#data === "string" )
            return `RecordEntry::${this.#data}`;

        if ( "Present" in this.#data )
            return {
                "RecordEntry::Present": EntryEnum( this.#data.Present ),
            };

        throw new TypeError(`Unknown record entry data of type '${typeof this.#data}'`);
    }
}
export const RecordOpStruct         = [
    Signature,
    ActionEnum,
];
export const RecordOpWithRecordEntryStruct  = [
    Signature,
    ActionEnum,
    RecordEntryEnum,
];
export const RecordOpWithEntryStruct        = [
    Signature,
    ActionEnum,
    EntryEnum,
];
export function ChainOpEnum ( data ) {
    data                                = normalize_enum_struct( data );

    if ( "StoreRecord" in data )
        return {
            StoreRecord: intoStruct( data.StoreRecord, RecordOpWithRecordEntryStruct ),
        };
    if ( "StoreEntry" in data )
        return {
            StoreEntry: intoStruct( data.StoreEntry, RecordOpWithEntryStruct ),
        };
    if ( "RegisterAgentActivity" in data )
        return {
            RegisterAgentActivity: intoStruct( data.RegisterAgentActivity, RecordOpStruct ),
        };

    return data;
}
export function WarrantOpEnum ( data ) {
    return data;
}
export function DhtOpEnum ( data ) {
    data                                = normalize_enum_struct( data );

    if ( "ChainOp" in data )
        return {
            ChainOp: ChainOpEnum( data.ChainOp ),
        };
    if ( "WarrantOp" in data )
        return WarrantOpEnum( data.WarrantOp );

    throw new TypeError(`Unknown entry type '${data.type}'`);
}
export const IntegrationDumpStruct      = {
    "validation_limbo":     VecType( DhtOpEnum ),
    "integration_limbo":    VecType( DhtOpEnum ),
    "integrated":           VecType( DhtOpEnum ),
    "dht_ops_cursor":       Number,
};
export const IntegrationDumpSummaryStruct  = {
    "validation_limbo":     Number,
    "integration_limbo":    Number,
    "integrated":           Number,
};

export const StateStruct                = {
    "peer_dump":            PeerDumpStruct,
    "source_chain_dump":    SourceChainDumpStruct,
    "integration_dump":     IntegrationDumpSummaryStruct,
};
export const FullStateStruct            = {
    "peer_dump":            PeerDumpStruct,
    "source_chain_dump":    SourceChainDumpStruct,
    "integration_dump":     IntegrationDumpStruct,
};
export const StateResponse              = [ StateStruct, String ];
export const FullStateResponse          = FullStateStruct;


export default {
    SignedActionStruct,
    SignedAction,
    StateResponse,
    FullStateResponse,
    query_whole_chain,
}
