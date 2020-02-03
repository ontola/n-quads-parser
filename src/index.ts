import {
  DataFactory,
  LowLevelStore,
  Quadruple,
  NamedNode,
  QuadPosition,
  BlankNode,
} from "@ontologies/core";

export class NQuadsParser {
  public store: LowLevelStore;
  public rdfFactory: DataFactory;

  public nnClosingTagError: () => Error = () => new Error(`named node without closing angle bracket`);
  public unexpectedCharError: (identifier: string) => Error = (identifier) => new Error(`Unexpected character '${identifier}'`);
  public errorHandler: (error: Error, quad: string) => void;

  public rdfLangString: NamedNode;
  public xsdString: NamedNode;
  public xsdBool: NamedNode;

  public readonly nnOpeningToken: string = '<';
  public readonly nnOpeningTokenOffset: number = this.nnOpeningToken.length;
  public readonly nnClosingToken: string = '>';
  public readonly nnClosingPostfix: string = '> ';
  public readonly nnClosingPostfixOffset: number = this.nnClosingPostfix.length;
  public readonly bnOpeningToken: string = '_';
  public readonly bnOpeningPrefix: string = '_:';
  public readonly bnOpeningPrefixOffset: number = this.bnOpeningPrefix.length;
  public readonly bnClosingToken: string = ' ';
  public readonly bnClosingTokenOffset: number = this.bnClosingToken.length;
  public readonly ltOpeningToken: string = '"';
  public readonly ltOpeningTokenOffset: number = this.ltOpeningToken.length;
  public readonly ltReservedReplace: RegExp = /\\(.)/g;
  public readonly ltReservedReplaceFn: (match: string) => string =
    (match: string): string => {
      switch (match) {
        case "\\n": return "\n";
        case "\\r": return "\r";
        case "\\\"": return "\"";
        case "\\\\": return "\\";
        default: throw new Error(`Unknown token ${match}`);
      }
    };
  public readonly ltNewline: string = '\n';
  public readonly lgOpeningToken: string = '@';
  public readonly lgOpeningTokenOffset: number = this.lgOpeningToken.length;
  public readonly lgClosingToken: string = ' ';
  public readonly dtSplitPrefix: string = '"^^<';
  public readonly dtSplitPrefixOffset: number = this.dtSplitPrefix.length;

  constructor(store: LowLevelStore, errorHandler: (error: Error, quad: string) => void = console.error) {
    this.store = store;
    this.rdfFactory = store.rdfFactory;
    this.errorHandler = errorHandler;

    this.rdfLangString = this.rdfFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#langString');
    this.xsdString = this.rdfFactory.namedNode('http://www.w3.org/2001/XMLSchema#string');
    this.xsdBool = this.rdfFactory.namedNode('http://www.w3.org/2001/XMLSchema#boolean');
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
    const blankNodeMap: { [k: string]: BlankNode } = {};

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
              throw this.nnClosingTagError();
            }

            subject = this.rdfFactory.namedNode(cleaned.substring(this.nnOpeningTokenOffset, rightBoundary));
            leftBoundary = rightBoundary + this.nnClosingPostfixOffset;
            break;

          case this.bnOpeningToken:
            rightBoundary = cleaned.indexOf(this.bnClosingToken);
            subject = cleaned.substring(this.bnOpeningPrefixOffset, rightBoundary);
            if (blankNodeMap[subject] !== undefined) {
              subject = blankNodeMap[subject];
            } else {
              subject = blankNodeMap[subject] = this.rdfFactory.blankNode();
            }
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
          throw this.nnClosingTagError();
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
              throw this.nnClosingTagError();
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
            object = cleaned.substring(leftBoundary, rightBoundary);
            if (blankNodeMap[object] !== undefined) {
              object = blankNodeMap[object];
            } else {
              object = blankNodeMap[object] = this.rdfFactory.blankNode();
            }
            break;
          case '"':
            leftBoundary = leftBoundary + this.ltOpeningTokenOffset;
            const objEndIndex = cleaned.lastIndexOf(this.ltOpeningToken);
            object = cleaned
              .substring(leftBoundary, objEndIndex)
              .replace(this.ltReservedReplace, this.ltReservedReplaceFn);
            leftBoundary = objEndIndex;
            dtOrLgBoundary = cleaned.indexOf(this.dtSplitPrefix, leftBoundary);

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
                datatype = this.rdfLangString;
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
        this.errorHandler(e, rawStatements[i]);
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
