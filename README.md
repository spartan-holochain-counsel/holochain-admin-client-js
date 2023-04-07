[![](https://img.shields.io/npm/v/@whi/holochain-admin-client/latest?style=flat-square)](http://npmjs.com/package/@whi/holochain-admin-client)

# Holochain Admin Client
A Javascript client for communicating with [Holochain](https://holochain.org)'s Admin Interface API.

[![](https://img.shields.io/github/issues-raw/mjbrisebois/holochain-admin-client-js?style=flat-square)](https://github.com/mjbrisebois/holochain-admin-client-js/issues)
[![](https://img.shields.io/github/issues-closed-raw/mjbrisebois/holochain-admin-client-js?style=flat-square)](https://github.com/mjbrisebois/holochain-admin-client-js/issues?q=is%3Aissue+is%3Aclosed)
[![](https://img.shields.io/github/issues-pr-raw/mjbrisebois/holochain-admin-client-js?style=flat-square)](https://github.com/mjbrisebois/holochain-admin-client-js/pulls)


## Overview
This client is guided by the interfaces defined in the
[holochain/holochain](https://github.com/holochain/holochain) project.

### Features

- Attach app interfaces
- Add admin interfaces
- Generate agents
- Register DNAs
- Install/uninstall apps
- Enable/disable apps
- List apps, agents, cells, DNAs, app interfaces
- Grant capabilities


## Install

```bash
npm i @whi/holochain-admin-client
```

## Basic Usage

### Admin Interface

#### Example

```javascript
import { AdminClient } from '@whi/holochain-admin-client';

const admin_interface_port = 12345;
const admin = new AdminClient( admin_interface_port );

await admin.generateAgent();
```


### API Reference

See [docs/API.md](docs/API.md)

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)
