import rdf, {
  LowLevelStore,
  NamedNode,
  Node,
  Quad,
  QuadPosition,
  Quadruple,
  SomeTerm,
  TermType,
} from "@ontologies/core";

import { NQuadsParser } from '../index';
import Constructable = jest.Constructable;

const getParser = () => {
    const store = {
        errors: [] as Error[],
        rdfFactory: rdf,

        quads: [] as Quad[],

        add(s: Node, p: NamedNode, o: SomeTerm, g: Node) {
            this.quads.push(rdf.quad(s, p, o, g));
        }
    };
    const parser = new NQuadsParser(
      store as unknown as LowLevelStore,
      (e) => store.errors.push(e),
  );

    return {  parser, store };
};

describe("index", () => {
    it("exports the parser", () => {
        expect(NQuadsParser).toBeDefined();
    });

    it("has an rdflib interface", () => {
        const input = `
            # Description
            _:bn0 <http://example.com/p> "test" . # Inline comment
            _:bn0 <http://example.com/p2> "1"^^<http://www.w3.org/2001/XMLSchema#integer> .`;
        const preindex = rdf.bnIndex;
        const { parser, store } = getParser();
        parser.loadBuf(input);

        expect(store.quads).toHaveLength(2);
        expect(store.quads).toEqual([
          rdf.quad(rdf.blankNode(`b${preindex + 1}`), rdf.namedNode("http://example.com/p"), rdf.literal("test")),
          rdf.quad(rdf.blankNode(`b${preindex + 1}`), rdf.namedNode("http://example.com/p2"), rdf.literal(1)),
        ]);
    });

    it("handles an empty string", () => {
        const { parser, store } = getParser();
        parser.parseString("");

        expect(store.quads).toHaveLength(0);
    });


    describe("syntax errors", () => {
        it("throws on syntax errors", () => {
            const errors: Array<[string, string | Constructable]> = [
                ['<http://example.com/ <http://example.com/p> "test" .', "named node without closing angle bracket"],
                ['http://example.com/> <http://example.com/p> "test" .', "Unexpected character 'h'"],
                ['_:0 <http://example.com/p> <http://example.com/p .', "named node without closing angle bracket"],
                ['_:0 <http://example.com/p> http://example.com/p> .', "Unexpected character 'h'"],
            ];

            for (const [serialized, error] of errors) {
                const { store, parser } = getParser();
                parser.parseString(serialized);

                expect(store.quads).toHaveLength(0);
                expect(store.errors.map((e) => e.message)).toContain(error);
            }
        });
    });

    const expectOutput = (term: string, result: any, graph = rdf.defaultGraph()) => {
        const { parser } = getParser();

        const output = parser.parseString(`<http://example.com/> <http://example.com/p> ${term} .`);

        expect(output).toHaveLength(1);
        const stmt = output[0];
        expect(stmt).toBeDefined();
        if (!stmt) {
            return;
        }
        expect(stmt[QuadPosition.object]).toEqual(result);
        expect(stmt[QuadPosition.graph]).toEqual(graph);
    };

    describe("blank nodes", () => {
      it("reassigns blank nodes", () => {
        const { parser } = getParser();
        const preindex = rdf.bnIndex;
        const output = parser.parseString(`_:blankNode <http://example.com/p> "value" .
            _:blankNode <http://example.com/p2> _:blankNode2 .
            _:blankNode2 <http://example.com/p> "value" .
        `) as Quadruple[];

        expect(output[0][0].termType).toEqual(TermType.BlankNode);
        expect(output[0][0].value).toEqual(`b${preindex + 1}`);

        expect(output[1][0].termType).toEqual(TermType.BlankNode);
        expect(output[1][0].value).toEqual(`b${preindex + 1}`);

        expect(output[1][2].termType).toEqual(TermType.BlankNode);
        expect(output[1][2].value).toEqual(`b${preindex + 2}`);

        expect(output[2][0].termType).toEqual(TermType.BlankNode);
        expect(output[2][0].value).toEqual(`b${preindex + 2}`);
      });
    });

    describe("triples", () => {
        describe("literals", () => {
            it ("parses canonical booleans", () => {
                expectOutput(
                  '"true"^^<http://www.w3.org/2001/XMLSchema#boolean>',
                  rdf.literal(true)
                );
            });

            it ("parses false canonical booleans", () => {
                expectOutput(
                  '"false"^^<http://www.w3.org/2001/XMLSchema#boolean>',
                  rdf.literal(false)
                );
            });

            it ("parses booleans", () => {
                expectOutput(
                  '"1"^^<http://www.w3.org/2001/XMLSchema#boolean>',
                  rdf.literal(true)
                );
            });

            it ("parses false booleans", () => {
                expectOutput(
                  '"0"^^<http://www.w3.org/2001/XMLSchema#boolean>',
                  rdf.literal(false)
                );
            });

            it ("parses numbers", () => {
                expectOutput(
                  '"4"^^<http://www.w3.org/2001/XMLSchema#integer>',
                  rdf.literal(4)
                );
            });

            it ("parses strings", () => {
                expectOutput(
                  '"test"',
                  rdf.literal("test")
                );
            });

            it ("parses language tags", () => {
                expectOutput(
                  '"test"@nl',
                  rdf.literal("test", 'nl')
                );
            });
        });
    });


    describe("quads", () => {
        it("parses quad", () => {
          const q = "<https://example.com/site/activities/119> <https://www.w3.org/ns/activitystreams#summary> \"<a href=\\\"https://example.com/site/u/user\\\" target=\\\"_blank\\\">Douglas Engelbart</a> made a comment on <a href=\\\"https://example.com/site/p/69\\\" target=\\\"_blank\\\">Post 1</a>\" <http://purl.org/link-lib/supplant> .\n"
          const { parser } = getParser();
          const [ quad ] = parser.parseString(q) as Quadruple[];

          expect(quad).toBeTruthy();
          expect(quad[QuadPosition.subject]?.value)
            .toEqual("https://example.com/site/activities/119");
          expect(quad[QuadPosition.predicate]?.value)
            .toEqual("https://www.w3.org/ns/activitystreams#summary");
          expect(quad[QuadPosition.object]?.value)
            .toEqual("<a href=\"https://example.com/site/u/user\" target=\"_blank\">Douglas Engelbart</a> made a comment on <a href=\"https://example.com/site/p/69\" target=\"_blank\">Post 1</a>");
          expect(quad[QuadPosition.graph]?.value)
            .toEqual("http://purl.org/link-lib/supplant");
        });

        describe("literals", () => {
            const g = rdf.namedNode('http://example.com/g');

            it ("parses booleans", () => {
                expectOutput(
                  `"1"^^<http://www.w3.org/2001/XMLSchema#boolean> <${g.value}>`,
                  rdf.literal(true),
                  g
                );
            });

            it ("parses numbers", () => {
                expectOutput(
                  `"4"^^<http://www.w3.org/2001/XMLSchema#integer> <${g.value}>`,
                  rdf.literal(4),
                  g
                );
            });

            it ("parses strings", () => {
                expectOutput(
                  `"test" <${g.value}>`,
                  rdf.literal("test"),
                  g
                );
            });

            it ("parses language tags", () => {
                expectOutput(
                  `"test"@nl <${g.value}>`,
                  rdf.literal("test", 'nl'),
                  g
                );
            });

            it("handles windows newlines", () => {
                expectOutput(
                  `"test\\r\\ntest2" <${g.value}>`,
                  rdf.literal("test\r\ntest2"),
                  g
                );
            });

            it("handles unix newlines", () => {
                expectOutput(
                   '"test\\ntest2" <' + g.value + '>',
                  rdf.literal("test\ntest2"),
                  g
                );
            });

            it("handles realworld newlines", () => {
                expectOutput(
                  `"Foobar! \\\"\\\\n\\\"" <${g.value}>`, // \"\\n\" -> "\n"
                  rdf.literal(`Foobar! "\\n"`),
                  g
                );
            });
        });
    });
});
