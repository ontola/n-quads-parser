import {
  DataFactory,
  LowLevelStore,
  Quadruple,
  NamedNode,
  QuadPosition,
} from "@ontologies/core";

export class NQuadsParser {
  public store: LowLevelStore;
  public rdfFactory: DataFactory;

  public nnClosingTagError: Error;
  public unexpectedCharError: (identifier: string) => Error;

  public xsdLangString: NamedNode;
  public xsdString: NamedNode;
  public xsdBool: NamedNode;

  public nnOpeningToken: string;
  public nnOpeningTokenOffset: number;
  public nnClosingToken: string;
  public nnClosingPostfix: string;
  public nnClosingPostfixOffset: number;
  public bnOpeningToken: string;
  public bnOpeningPrefix: string;
  public bnOpeningPrefixOffset: number;
  public bnClosingToken: string;
  public bnClosingTokenOffset: number;
  public ltOpeningToken: string;
  public ltOpeningTokenOffset: number;
  public ltQuoteReplaceValue: string;
  public ltQuoteUnescape: RegExp;
  public ltWhitespaceReplace: RegExp;
  public ltNewline: string;
  public lgOpeningToken: string;
  public lgOpeningTokenOffset: number;
  public lgClosingToken: string;
  public dtSplitPrefix: string;
  public dtSplitPrefixOffset: number;

  constructor(store: LowLevelStore) {
    this.store = store;
    this.rdfFactory = store.rdfFactory;

    this.nnClosingTagError = new Error(`named node without closing angle bracket`);
    this.unexpectedCharError = (identifier) => new Error(`Unexpected character '${identifier}'`);

    this.xsdLangString = this.rdfFactory.namedNode('http://www.w3.org/2001/XMLSchema#langString');
    this.xsdString = this.rdfFactory.namedNode('http://www.w3.org/2001/XMLSchema#string');
    this.xsdBool = this.rdfFactory.namedNode('http://www.w3.org/2001/XMLSchema#boolean');

    this.nnOpeningToken = '<';
    this.nnOpeningTokenOffset = this.nnOpeningToken.length;
    this.nnClosingToken = '>';
    this.nnClosingPostfix = '> ';
    this.nnClosingPostfixOffset = this.nnClosingPostfix.length;
    this.bnOpeningToken = '_';
    this.bnOpeningPrefix = '_:';
    this.bnOpeningPrefixOffset = this.bnOpeningPrefix.length;
    this.bnClosingToken = ' ';
    this.bnClosingTokenOffset = this.bnClosingToken.length;
    this.ltOpeningToken = '"';
    this.ltOpeningTokenOffset = this.ltOpeningToken.length;
    this.ltQuoteUnescape = /\\"/g;
    this.ltQuoteReplaceValue = '"';
    this.ltWhitespaceReplace = /(\\r)?\\n/g;
    this.ltNewline = '\n';
    this.lgOpeningToken = '@';
    this.lgOpeningTokenOffset = this.lgOpeningToken.length;
    this.lgClosingToken = ' ';
    this.dtSplitPrefix = '"^^<';
    this.dtSplitPrefixOffset = this.dtSplitPrefix.length;
  }

  loadBuf(str: string) {
    this.addArr(this.parseString(str));
  }

  parseString(str: string): Array<Quadruple|void> {
    if (!str || str.length === 0) {
      return [];
    }

    const rawStatements = str.split('\n');
    let i, len = rawStatements.length;
    const quads = new Array(len);

    let cleaned, rightBoundary, leftBoundary;
    let subject, predicate, object, graph;
    let dtOrLgBoundary, lang, datatype;

    for (i = 0; i < len; i++) {
      try {
        cleaned = rawStatements[i].trim();
        if (cleaned.length === 0) {
          continue
        }

        rightBoundary = -1;
        leftBoundary = -1;

        /*
         * Parse the subject
         */
        switch (cleaned.charAt(0)) {
          case '#':
            continue;

          case this.nnOpeningToken:
            rightBoundary = cleaned.indexOf(this.nnClosingPostfix);

            if (rightBoundary === -1) {
              throw this.nnClosingTagError;
            }

            subject = this.rdfFactory.namedNode(cleaned.substring(this.nnOpeningTokenOffset, rightBoundary));
            leftBoundary = rightBoundary + this.nnClosingPostfixOffset;
            break;

          case this.bnOpeningToken:
            rightBoundary = cleaned.indexOf(this.bnClosingToken);
            subject = this.rdfFactory.blankNode(cleaned.substring(this.bnOpeningPrefixOffset, rightBoundary));
            leftBoundary = rightBoundary + this.bnClosingTokenOffset;
            break;

          default:
            throw this.unexpectedCharError(cleaned.charAt(0));
        }

        /*
         * Parse the predicate
         */
        // We currently assume blank nodes can't be predicates
        rightBoundary = cleaned.indexOf(this.nnClosingPostfix, leftBoundary);

        if (rightBoundary === -1) {
          throw this.nnClosingTagError;
        }

        leftBoundary = cleaned.indexOf(this.nnOpeningToken, leftBoundary) + this.nnOpeningTokenOffset;
        predicate = this.rdfFactory.namedNode(cleaned.substring(leftBoundary, rightBoundary));
        leftBoundary = rightBoundary + this.nnClosingPostfixOffset;

        /*
         * Parse the object
         */
        dtOrLgBoundary = -1;

        switch (cleaned.charAt(leftBoundary)) {
          case this.nnOpeningToken:
            leftBoundary = leftBoundary + this.nnOpeningTokenOffset;
            // When parsing ntriples, the space of the nnClosingPostfix might not exist, so it can't be used
            rightBoundary = cleaned.indexOf(this.nnClosingToken, leftBoundary);

            if (rightBoundary === -1) {
              throw this.nnClosingTagError;
            }

            object = this.rdfFactory.namedNode(cleaned.substring(leftBoundary, rightBoundary));
            break;
          case this.bnOpeningToken:
            leftBoundary = cleaned.indexOf(this.bnOpeningPrefix, leftBoundary) + this.bnOpeningPrefixOffset;
            rightBoundary = cleaned.indexOf(this.bnClosingToken, leftBoundary);
            // Doesn't contain a comment, nor is a quad, so the bn id is followed by the newline
            if (rightBoundary === -1) {
              rightBoundary = Infinity
            }
            object = this.rdfFactory.blankNode(cleaned.substring(leftBoundary, rightBoundary));
            break;
          case '"':
            leftBoundary = leftBoundary + this.ltOpeningTokenOffset;
            object = cleaned
              .substring(leftBoundary, cleaned.lastIndexOf(this.ltOpeningToken))
              .replace(this.ltWhitespaceReplace, this.ltNewline);
            leftBoundary += object.length;
            dtOrLgBoundary = cleaned.indexOf(this.dtSplitPrefix, leftBoundary);
            object = object.replace(this.ltQuoteUnescape, this.ltQuoteReplaceValue);

            if (dtOrLgBoundary >= 0) {
              // Typed literal
              rightBoundary = cleaned.indexOf(this.nnClosingToken, dtOrLgBoundary);
              datatype = this.rdfFactory.namedNode(cleaned.substring(dtOrLgBoundary + this.dtSplitPrefixOffset, rightBoundary));
              if (datatype.value === this.xsdBool.value && (object === "1" || object === "0")) {
                object = object === "1" ? "true" : "false";
              }
              leftBoundary = rightBoundary
            } else {
              dtOrLgBoundary = cleaned.indexOf(this.lgOpeningToken, leftBoundary);
              if (dtOrLgBoundary >= 0) {
                lang = cleaned.substring(
                    dtOrLgBoundary + this.lgOpeningTokenOffset,
                    cleaned.indexOf(this.lgClosingToken, dtOrLgBoundary + this.lgOpeningTokenOffset)
                );
                datatype = this.xsdLangString;
              } else {
                // Implicit literals are strings
                datatype = this.xsdString;
              }
            }
            object = this.rdfFactory.literal(
              object,
              lang || datatype
            );
            break;
          default:
            throw this.unexpectedCharError(cleaned.charAt(leftBoundary));
        }

        /*
         * Parse the graph, if any
         */
        leftBoundary = cleaned.indexOf(this.nnOpeningToken, leftBoundary) + this.nnOpeningTokenOffset;
        graph = leftBoundary - this.nnOpeningTokenOffset >= 0
          ? this.rdfFactory.namedNode(cleaned.substring(leftBoundary, cleaned.indexOf(this.nnClosingPostfix, leftBoundary)))
          : this.rdfFactory.defaultGraph();

        quads[i] = [subject, predicate, object, graph];
      } catch(e) {
        console.error(e, rawStatements[i]);
      }
    }

    return quads;
  }

  addArr(quads: Array<Quadruple|void>): void {
    let q;
    for (let i = 0, len = quads.length; i < len; i++) {
      q = quads[i];
      if (q) {
        this.store.add(
          q[QuadPosition.subject],
          q[QuadPosition.predicate],
          q[QuadPosition.object],
          q[QuadPosition.graph],
        );
      }
    }
  }
}
