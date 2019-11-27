# NQuads parser

This is a basic, but fast pure-js n-quads/triples parser. It has no dependencies to node and can be
run in the browser.

# Installation

`yarn add n-quads-parser @ontologies/core`

`npm i n-quads-parser @ontologies/core`

## Usage
This was written as a faster n-quads parser for [link-lib](https://github.com/fletcher91/link-lib)
and designed to work with [rdflib.js](http://github.com/linkeddata/rdflib.js). 

The parser is already integrated into link-lib which can also consume
[linked-delta](https://purl.org/linked-delta) payloads in addition to plain n-quads.

If you're looking for a quick and easy way to build linked-data based RDF applications, check out
[link-redux](https://github.com/fletcher91/link-redux).

Plain javascript:
```javascript
import rdf from '@ontologies/core';

// Can also be IndexedFormula from rdflib.js or RDFStore from link-lib.
const store = {
    rdfFactory: rdf,
    quads: [],
    
    add(s, p, o, g) {
      this.quads.push(rdf.quad(s, p, o, g));
    }
}

const parser = new NQuadsParser(store);

fetch(url)
  .then((req) => req.text())
  .then((body) => parser.loadBuf(body));

// The quads should be loaded into the store.
```

## TODO:

* Implement the [whatwg streams](https://streams.spec.whatwg.org/) interface
* Add the spec test suite
