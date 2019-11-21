
export class Term {
  public readonly termType: TermType;
  public readonly value: string;
  public readonly datatype: Term | null;
  public readonly language: string | null;

  constructor(termType: TermType,
              value: string,
              datatype: Term | null,
              language: string | null) {
    this.termType = termType;
    this.value = value;
    this.datatype = datatype;
    this.language = language;
  }
}

export class Quad {
  public readonly subject: Term;
  public readonly predicate: Term;
  public readonly object: Term;
  public readonly graph: Term;

  constructor(s: Term, p: Term, o: Term, g: Term) {
    this.subject = s;
    this.predicate = p;
    this.object = o;
    this.graph = g;
  }
}

export class LowLevelStore {
  public readonly quads: Quad[];
  public readonly rdfFactory: DataFactory;

  constructor() {
    this.quads = new Array<Quad>(0);
    this.rdfFactory = new DataFactory();
  }

  public add(s: Term, p: Term, o: Term, g: Term): void {
    this.quads.push(new Quad(s, p, o, g));
  }
}

export class DataFactory {
  namedNode(v: string): Term {
    return new Term(TermType.NamedNode, v, null, null);
  }

  blankNode(v: string | null): Term {
    return new Term(TermType.BlankNode, v == null ? "" : v!, null, null);
  }

  literal(v: string, datatype: Term, lang: string): Term {
    return new Term(TermType.Literal, v, datatype, lang);
  }

  defaultGraph(): Term {
    return new Term(TermType.NamedNode, "rdf:defaultGraph", null, null);
  }
}

export enum QuadPosition {
  subject,
  predicate,
  object,
  graph,
}

export enum TermType {
  BlankNode,
  NamedNode,
  Literal,
}

export interface ITerm {
  termType: TermType;
  value: string;

  datatype: Term | null
  language: string | null;
}

export type Quadruple = Array<Term>;

