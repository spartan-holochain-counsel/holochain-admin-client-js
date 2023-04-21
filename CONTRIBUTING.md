[back to README.md](README.md)

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
import { logging } from '@whi/holochain-admin-client';

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
- `@whi/holo-hash` - 10kb
- `@whi/holochain-websocket` - 16kb

### Testing

To run all tests with logging
```
make test-debug
```

- `make test-integration-debug` - **Integration tests only**
- `make test-e2e-debug` - **End-2-end tests only**

> **NOTE:** remove `-debug` to run tests without logging
