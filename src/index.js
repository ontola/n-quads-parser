export default class NQuadsParser {
  constructor(store) {
    this.store = store

    this.nnClosingTagError = new Error(`named node without closing angle bracket`)
    this.unexpectedCharError = (identifier) => new Error(`Unexpected character '${identifier}'`)

    this.xsdLangString = 'http://www.w3.org/2001/XMLSchema#langString';
    this.xsdString = 'http://www.w3.org/2001/XMLSchema#string';

    this.nnOpeningToken = '<'
    this.nnOpeningTokenOffset = this.nnOpeningToken.length
    this.nnClosingToken = '>'
    this.nnClosingPostfix = '> '
    this.nnClosingPostfixOffset = this.nnClosingPostfix.length
    this.bnOpeningToken = '_'
    this.bnOpeningPrefix = '_:'
    this.bnOpeningPrefixOffset = this.bnOpeningPrefix.length
    this.bnClosingToken = ' '
    this.bnClosingTokenOffset = this.bnClosingToken.length
    this.ltOpeningToken = '"'
    this.ltOpeningTokenOffset = this.ltOpeningToken.length
    this.ltWhitespaceReplace = /\\r\\n/g
    this.ltNewline = '\n'
    this.lgOpeningToken = '@'
    this.lgOpeningTokenOffset = this.lgOpeningToken.length
    this.lgClosingToken = ' '
    this.dtSplitPrefix = '"^^<'
    this.dtSplitPrefixOffset = this.dtSplitPrefix.length
  }

  loadBuf(str) {
    this.addArr(this.parseString(str))
  }

  parseString(str) {
    if (!str || str.length === 0) {
      return []
    }

    const rawStatements = str.split('\n')
    let i, len = rawStatements.length
    const quads = new Array(len)

    let cleaned, rightBoundary, leftBoundary
    let subject, predicate, object, graph
    let dtOrLgBoundary, lang, datatype

    for (i = 0; i < len; i++) {
      try {
        cleaned = rawStatements[i].trim()
        if (cleaned.length === 0) {
          quads.length--;
          continue
        }

        rightBoundary = -1
        leftBoundary = -1

        /*
         * Parse the subject
         */
        switch (cleaned.charAt(0)) {
          case '#':
            quads.length--;
            continue

          case this.nnOpeningToken:
            rightBoundary = cleaned.indexOf(this.nnClosingPostfix)

            if (rightBoundary === -1) {
              throw this.nnClosingTagError
            }

            subject = this.store.sym(cleaned.substring(this.nnOpeningTokenOffset, rightBoundary))
            leftBoundary = rightBoundary + this.nnClosingPostfixOffset
            break

          case this.bnOpeningToken:
            rightBoundary = cleaned.indexOf(this.bnClosingToken)
            subject = this.store.bnode(cleaned.substring(this.bnOpeningPrefixOffset, rightBoundary))
            leftBoundary = rightBoundary + this.bnClosingTokenOffset
            break

          default:
            throw this.unexpectedCharError(cleaned.charAt(0))
        }

        /*
         * Parse the predicate
         */
        // We currently assume blank nodes can't be predicates
        rightBoundary = cleaned.indexOf(this.nnClosingPostfix, leftBoundary)

        if (rightBoundary === -1) {
          throw this.nnClosingTagError
        }

        leftBoundary = cleaned.indexOf(this.nnOpeningToken, leftBoundary) + this.nnOpeningTokenOffset
        predicate = this.store.sym(cleaned.substring(leftBoundary, rightBoundary))
        leftBoundary = rightBoundary + this.nnClosingPostfixOffset

        /*
         * Parse the object
         */
        dtOrLgBoundary = -1

        switch (cleaned.charAt(leftBoundary)) {
          case this.nnOpeningToken:
            leftBoundary = leftBoundary + this.nnOpeningTokenOffset
            // When parsing ntriples, the space of the nnClosingPostfix might not exist, so it can't be used
            rightBoundary = cleaned.indexOf(this.nnClosingToken, leftBoundary)

            if (rightBoundary === -1) {
              throw this.nnClosingTagError
            }

            object = this.store.sym(cleaned.substring(leftBoundary, rightBoundary))
            break
          case this.bnOpeningToken:
            leftBoundary = cleaned.indexOf(this.bnOpeningPrefix, leftBoundary) + this.bnOpeningPrefixOffset
            rightBoundary = cleaned.indexOf(this.bnClosingToken, leftBoundary)
            // Doesn't contain a comment, nor is a quad, so the bn id is followed by the newline
            if (rightBoundary === -1) {
              rightBoundary = Infinity
            }
            object = this.store.bnode(cleaned.substring(leftBoundary, rightBoundary))
            break
          case '"':
            leftBoundary = leftBoundary + this.ltOpeningTokenOffset
            object = cleaned
              .substring(leftBoundary, cleaned.lastIndexOf(this.ltOpeningToken))
              .replace(this.ltWhitespaceReplace, this.ltNewline)
            leftBoundary += object.length
            dtOrLgBoundary = cleaned.indexOf(this.dtSplitPrefix, leftBoundary)
            if (dtOrLgBoundary >= 0) {
              // Typed literal
              rightBoundary = cleaned.indexOf(this.nnClosingToken, dtOrLgBoundary)
              datatype = this.store.sym(cleaned.substring(dtOrLgBoundary + this.dtSplitPrefixOffset, rightBoundary))
              leftBoundary = rightBoundary
            } else {
              dtOrLgBoundary = cleaned.indexOf(this.lgOpeningToken, leftBoundary)
              if (dtOrLgBoundary >= 0) {
                lang = cleaned.substring(leftBoundary + this.lgOpeningTokenOffset, cleaned.lastIndexOf(this.lgClosingToken))
                datatype = this.xsdLangString
              } else {
                // Implicit literals are strings
                datatype = this.xsdString
              }
            }
            object = this.store.literal(
              object,
              lang,
              datatype
            )
            break
          default:
            throw this.unexpectedCharError(cleaned.charAt(leftBoundary))
        }

        /*
         * Parse the graph, if any
         */
        leftBoundary = cleaned.indexOf(this.nnOpeningToken, leftBoundary) + this.nnOpeningTokenOffset
        graph = leftBoundary - this.nnOpeningTokenOffset >= 0
          ? this.store.sym(cleaned.substring(leftBoundary, cleaned.indexOf(this.nnClosingPostfix, leftBoundary)))
          : this.store.defaultGraphIRI

        quads[i] = [subject, predicate, object, graph]
      } catch(e) {
        console.error(e, rawStatements[i])
      }
    }

    return quads
  }

  addArr(quads) {
    let q
    for (let i = 0, len = quads.length; i < len; i++) {
      q = quads[i]
      if (q) {
        this.store.add(q[0], q[1], q[2], q[3])
      }
    }
  }
}
