# Solidity Merkle Mountain Range library

### What's a Merkle Mountain Range?

- Append only data structure
- Easy for inclusion proof
- Use significantly small amount of gas to append a new item

More detailed information [here](https://github.com/mimblewimble/grin/blob/master/doc/mmr.md)

### Tests

```bash
# In terminal 1
yarn
truffle develop

# In terminal 2
truffle test test/TestMMR.js
```
