import {
  DataFactory,
  LowLevelStore,
  Quadruple,
  QuadPosition,
  Term,
} from "./types";

export class NQuadsParser {
  public store: LowLevelStore;
  public rdfFactory: DataFactory;

  public nnClosingTagError: Error;
  public unexpectedCharError: (identifier: string) => Error;

  public xsdLangString: Term;
  public xsdString: Term;

  public commentCharCode: i32;
  public nnOpeningToken: string;
  public nnOpeningTokenCharCode: i32;
  public nnOpeningTokenOffset: i8;
  public nnClosingToken: string;
  public nnClosingPostfix: string;
  public nnClosingPostfixOffset: i8;
  public bnOpeningToken: string;
  public bnOpeningTokenCharCode: i32;
  public bnOpeningPrefix: string;
  public bnOpeningPrefixOffset: i8;
  public bnClosingToken: string;
  public bnClosingTokenOffset: i8;
  public ltOpeningToken: string;
  public ltOpeningTokenCharCode: i32;
  public ltOpeningTokenOffset: i8;
  public ltQuoteReplaceValue: string;
  public ltQuoteUnescape: string;
  public ltWhitespaceRemove: string;
  public emptyString: string;
  public lgOpeningToken: string;
  public lgOpeningTokenOffset: i8;
  public lgClosingToken: string;
  public dtSplitPrefix: string;
  public dtSplitPrefixOffset: i8;

  constructor(store: LowLevelStore) {
    this.store = store;
    this.rdfFactory = store.rdfFactory;

    this.nnClosingTagError = new Error(`named node without closing angle bracket`);
    this.unexpectedCharError = (identifier) => new Error(`Unexpected character '${identifier}'`);

    this.xsdLangString = this.rdfFactory.namedNode('http://www.w3.org/2001/XMLSchema#langString');
    this.xsdString = this.rdfFactory.namedNode('http://www.w3.org/2001/XMLSchema#string');

    this.commentCharCode = '#'.charCodeAt(0);
    this.nnOpeningToken = '<';
    this.nnOpeningTokenCharCode = this.nnOpeningToken.charCodeAt(0);
    this.nnOpeningTokenOffset = i8(this.nnOpeningToken.length);
    this.nnClosingToken = '>';
    this.nnClosingPostfix = '> ';
    this.nnClosingPostfixOffset = i8(this.nnClosingPostfix.length);
    this.bnOpeningToken = '_';
    this.bnOpeningTokenCharCode = this.bnOpeningToken.charCodeAt(0);
    this.bnOpeningPrefix = '_:';
    this.bnOpeningPrefixOffset = i8(this.bnOpeningPrefix.length);
    this.bnClosingToken = ' ';
    this.bnClosingTokenOffset = i8(this.bnClosingToken.length);
    this.ltOpeningToken = '"';
    this.ltOpeningTokenCharCode = this.ltOpeningToken.charCodeAt(0);
    this.ltOpeningTokenOffset = i8(this.ltOpeningToken.length);
    this.ltQuoteUnescape = '\\"';
    this.ltQuoteReplaceValue = '"';
    this.ltWhitespaceRemove = '\r';
    this.emptyString = '';
    this.lgOpeningToken = '@';
    this.lgOpeningTokenOffset = i8(this.lgOpeningToken.length);
    this.lgClosingToken = ' ';
    this.dtSplitPrefix = '"^^<';
    this.dtSplitPrefixOffset = i8(this.dtSplitPrefix.length);
  }

  loadBuf(str: string): void {
    this.addArr(this.parseString(str));
  }

  parseString(str: string): Array<Quadruple> {
    if (!str || str.length === 0) {
      return [];
    }

    const rawStatements = str.split('\n');
    let i: i32, len = rawStatements.length;
    const quads = new Array<Quadruple>(len);

    let cleaned: string, rightBoundary: i32, leftBoundary: i32;
    let subject: Term;
    let predicate: Term;
    let object: Term;
    let objectVal: string;
    let graph: Term;
    let dtOrLgBoundary: i32;
    let lang: string = "";
    let datatype: Term;

    for (i = 0; i < len; i++) {
      cleaned = rawStatements[i].trim();
      if (cleaned.length === 0) {
        continue
      }

      rightBoundary = -1;
      leftBoundary = -1;

      /*
       * Parse the subject
       */
      switch (cleaned.charCodeAt(0)) {
        case this.commentCharCode:
          continue;

        case this.nnOpeningTokenCharCode:
          rightBoundary = cleaned.indexOf(this.nnClosingPostfix);

          if (rightBoundary === -1) {
            throw this.nnClosingTagError;
          }

          subject = this.rdfFactory.namedNode(cleaned.substring(this.nnOpeningTokenOffset, rightBoundary));
          leftBoundary = rightBoundary + this.nnClosingPostfixOffset;
          break;

        case this.bnOpeningTokenCharCode:
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

      switch (cleaned.charCodeAt(leftBoundary)) {
        case this.nnOpeningTokenCharCode:
          leftBoundary = leftBoundary + this.nnOpeningTokenOffset;
          // When parsing ntriples, the space of the nnClosingPostfix might not exist, so it can't be used
          rightBoundary = cleaned.indexOf(this.nnClosingToken, leftBoundary);

          if (rightBoundary === -1) {
            throw this.nnClosingTagError;
          }

          object = this.rdfFactory.namedNode(cleaned.substring(leftBoundary, rightBoundary));
          break;
        case this.bnOpeningTokenCharCode:
          leftBoundary = cleaned.indexOf(this.bnOpeningPrefix, leftBoundary) + this.bnOpeningPrefixOffset;
          rightBoundary = cleaned.indexOf(this.bnClosingToken, leftBoundary);
          // Doesn't contain a comment, nor is a quad, so the bn id is followed by the newline
          if (rightBoundary === -1) {
            rightBoundary = i32(Number.MAX_VALUE);
          }
          object = this.rdfFactory.blankNode(cleaned.substring(leftBoundary, rightBoundary));
          break;
        case this.ltOpeningTokenCharCode:
          leftBoundary = leftBoundary + this.ltOpeningTokenOffset;
          objectVal = cleaned
            .substring(leftBoundary, cleaned.lastIndexOf(this.ltOpeningToken))
            .replaceAll(this.ltWhitespaceRemove, this.emptyString);
          leftBoundary += objectVal.length;
          dtOrLgBoundary = cleaned.indexOf(this.dtSplitPrefix, leftBoundary);
          if (dtOrLgBoundary >= 0) {
            // Typed literal
            rightBoundary = cleaned.indexOf(this.nnClosingToken, dtOrLgBoundary);
            datatype = this.rdfFactory.namedNode(cleaned.substring(dtOrLgBoundary + this.dtSplitPrefixOffset, rightBoundary));
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
            objectVal.replaceAll(this.ltQuoteUnescape, this.ltQuoteReplaceValue),
            datatype,
            lang
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
    }

    return quads;
  }

  addArr(quads: Array<Quadruple>): void {
    let q: Quadruple;
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
