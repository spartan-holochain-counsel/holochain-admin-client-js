[back to README.md](README.md)

[![](https://img.shields.io/github/actions/workflow/status/spartan-holochain-counsel/holochain-admin-client-js/all-tests.yml?branch=master&style=flat-square&label=master)](https://github.com/spartan-holochain-counsel/holochain-admin-client-js/actions/workflows/all-tests.yml?query=branch%3Amaster)

# Contributing

## Overview
This package is designed to work with Holochain's [Admin
Interface](https://github.com/holochain/holochain/blob/HEAD/crates/holochain_conductor_api/src/admin_interface.rs)
API.


## Development

See [docs/API.md](docs/API.md) for detailed API References

### `logging()`
Turns on debugging logs.

```javascript
import { logging } from '@spartan-hc/holochain-admin-client';

logging(); // show debug logs
```

### Environment

- Developed using Node.js `v18.14.2`
- Enter `nix develop` for development environment dependencies.

### Building
No build is required for Node.

Bundling with Webpack is supported for web
```
npx webpack
```

### Minified Size Breakdown
Sizes are approximate

- base size - 9kb
- `@msgpack/msgpack`
  - `decode` - 16kb
- `@spartan-hc/holo-hash` - 10kb
- `@spartan-hc/holochain-websocket` - 16kb

### Testing

To run all tests with logging
```
make test-debug
```

- `make test-integration-debug` - **Integration tests only**
- `make test-e2e-debug` - **End-2-end tests only**

> **NOTE:** remove `-debug` to run tests without logging
