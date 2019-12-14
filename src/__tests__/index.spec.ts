import rdf, {
    LowLevelStore,
    NamedNode,
    Node,
    Quad,
    QuadPosition,
    SomeTerm,
} from "@ontologies/core";

import { NQuadsParser } from '../index';

const getParser = () => {
    const store = {
        rdfFactory: rdf,

        quads: [] as Quad[],

        add(s: Node, p: NamedNode, o: SomeTerm, g: Node) {
            this.quads.push(rdf.quad(s, p, o, g));
        }
    };
    const parser = new NQuadsParser(store as unknown as LowLevelStore);

    return {  parser, store };
};

describe("index", () => {
    it("exports the parser", () => {
        expect(NQuadsParser).toBeDefined();
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

    describe("triples", () => {
        describe("literals", () => {
            it ("parses canonical booleans", () => {
                expectOutput(
                  '"true"^^<http://www.w3.org/2001/XMLSchema#boolean>',
                  rdf.literal(true)
                );
            });

            it ("parses booleans", () => {
                expectOutput(
                  '"1"^^<http://www.w3.org/2001/XMLSchema#boolean>',
                  rdf.literal(true)
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
                  rdf.literal("test\ntest2"),
                  g
                );
            });

            it("handles unix newlines", () => {
                expectOutput(
                  `"test\\ntest2" <${g.value}>`,
                  rdf.literal("test\ntest2"),
                  g
                );
            });
        });
    });
});
