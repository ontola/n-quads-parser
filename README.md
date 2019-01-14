# NQuads parser

This is a basic, but fast pure-js n-quads parser. It has no dependencies to node and can be run in the browser without any additional packages.

# Installation

`yarn add n-quads-parser`

`npm i n-quads-parser`

## Usage
This was written as a faster n-quads parser for [link-lib](https://github.com/fletcher91/link-lib) and designed to work with [rdflib.js](http://github.com/linkeddata/rdflib.js).

If you're looking for a way to build linked-data enabled RDF applications fast, check out [link-redux](https://github.com/fletcher91/link-redux).

RDFlib doesn't have (at the time of writing) dependency injection, one must either fork and modify rdflib or use [our fork](https://npmjs.com/package/link-rdflib).
Note that the latter has performance patches over the native RDFlib, but is also more strict in object creation.

Plain javascript:
```javascript
import { IndexedFormula } from 'rdflib';

// Doesn't have to be from rdflib, check the parser file for the handful methods required
const store = new IndexedFormula();
const parser = new NQuadsParser();

fetch(url)
  .then((req) => req.text())
  .then((body) => parser.loadBuf(body));

// The statements should be loaded into the store.
```

## TODO:

* Implement the [whatwg streams](https://streams.spec.whatwg.org/) interface
* Add the spec test suite
