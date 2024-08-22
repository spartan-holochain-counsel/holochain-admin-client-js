import type { Logger }			from '@whi/weblogger';
import type {
    AdminClient,
}					from '../../lib/node.js';
import {
    Command,
}					from 'commander';



export type NoOp = () => void;

export type ActionCallback = (
    ctx:                {
        log:        Logger,
        admin:      AdminClient
    },
    ...args:        any[]
) => Promise<any>;

export type ActionContext = (
    action_callback:    ActionCallback,
) => (...args: any[]) => void;

export type SubProgramInit = (
    program:            Command,
    action_context:     ActionContext,
    auto_help:          NoOp,
) => Command;
