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

    describe("triples", () => {
        describe("literals", () => {
            it ("parses canonical booleans", () => {
                const { parser } = getParser();
                const input = '<http://example.com/> <http://example.com/p> "true"^^<http://www.w3.org/2001/XMLSchema#boolean> .';

                const result = parser.parseString(input);

                expect(result).toHaveLength(1);
                const stmt = result[0];
                expect(stmt).toBeDefined();
                if (!stmt) {
                    return;
                }
                expect(stmt[QuadPosition.object]).toEqual(rdf.literal(true));
            });

            it ("parses booleans", () => {
                const { parser } = getParser();
                const input = '<http://example.com/> <http://example.com/p> "1"^^<http://www.w3.org/2001/XMLSchema#boolean> .';

                const result = parser.parseString(input);

                expect(result).toHaveLength(1);
                const stmt = result[0];
                expect(stmt).toBeDefined();
                if (!stmt) {
                    return;
                }
                expect(stmt[QuadPosition.object]).toEqual(rdf.literal(true));
            });

            it ("parses numbers", () => {
                const { parser } = getParser();
                const input = '<http://example.com/> <http://example.com/p> "4"^^<http://www.w3.org/2001/XMLSchema#integer> .';

                const result = parser.parseString(input);

                expect(result).toHaveLength(1);
                const stmt = result[0];
                expect(stmt).toBeDefined();
                if (!stmt) {
                    return;
                }
                expect(stmt[QuadPosition.object]).toEqual(rdf.literal(4));
            });

            it ("parses strings", () => {
                const { parser } = getParser();
                const input = '<http://example.com/> <http://example.com/p> "test" .';

                const result = parser.parseString(input);

                expect(result).toHaveLength(1);
                const stmt = result[0];
                expect(stmt).toBeDefined();
                if (!stmt) {
                    return;
                }
                expect(stmt[QuadPosition.object]).toEqual(rdf.literal("test"));
            });

            it ("parses language tags", () => {
                const { parser } = getParser();
                const input = '<http://example.com/> <http://example.com/p> "test"@nl .';

                const result = parser.parseString(input);

                expect(result).toHaveLength(1);
                const stmt = result[0];
                expect(stmt).toBeDefined();
                if (!stmt) {
                    return;
                }
                expect(stmt[QuadPosition.object]).toEqual(rdf.literal("test", 'nl'));
            });
        });
    });


    describe("quads", () => {
        describe("literals", () => {
            it ("parses booleans", () => {
                const { parser } = getParser();
                const input = '<http://example.com/> <http://example.com/p> "1"^^<http://www.w3.org/2001/XMLSchema#boolean> <http://example.com/g> .';

                const result = parser.parseString(input);

                expect(result).toHaveLength(1);
                const stmt = result[0];
                expect(stmt).toBeDefined();
                if (!stmt) {
                    return;
                }
                expect(stmt[QuadPosition.object]).toEqual(rdf.literal(true));
            });

            it ("parses numbers", () => {
                const { parser } = getParser();
                const input = '<http://example.com/> <http://example.com/p> "4"^^<http://www.w3.org/2001/XMLSchema#integer> <http://example.com/g> .';

                const result = parser.parseString(input);

                expect(result).toHaveLength(1);
                const stmt = result[0];
                expect(stmt).toBeDefined();
                if (!stmt) {
                    return;
                }
                expect(stmt[QuadPosition.object]).toEqual(rdf.literal(4));
            });

            it ("parses strings", () => {
                const { parser } = getParser();
                const input = '<http://example.com/> <http://example.com/p> "test" <http://example.com/g> .';

                const result = parser.parseString(input);

                expect(result).toHaveLength(1);
                const stmt = result[0];
                expect(stmt).toBeDefined();
                if (!stmt) {
                    return;
                }
                expect(stmt[QuadPosition.object]).toEqual(rdf.literal("test"));
            });

            it ("parses language tags", () => {
                const { parser } = getParser();
                const input = '<http://example.com/> <http://example.com/p> "test"@nl <http://example.com/g> .';

                const result = parser.parseString(input);

                expect(result).toHaveLength(1);
                const stmt = result[0];
                expect(stmt).toBeDefined();
                if (!stmt) {
                    return;
                }
                expect(stmt[QuadPosition.object]).toEqual(rdf.literal("test", 'nl'));
            });

            it("handles windows newlines", () => {
                const { parser } = getParser();
                const input = '<http://example.com/> <http://example.com/p> "test\\r\\ntest2" <http://example.com/g> .';

                const result = parser.parseString(input);

                expect(result).toHaveLength(1);
                const stmt = result[0];
                expect(stmt).toBeDefined();
                if (!stmt) {
                    return;
                }
                expect(stmt[QuadPosition.object]).toEqual(rdf.literal("test\ntest2"));
            });

            it("handles unix newlines", () => {
                const { parser } = getParser();
                const input = '<http://example.com/> <http://example.com/p> "test\\ntest2" <http://example.com/g> .';

                const result = parser.parseString(input);

                expect(result).toHaveLength(1);
                const stmt = result[0];
                expect(stmt).toBeDefined();
                if (!stmt) {
                    return;
                }
                expect(stmt[QuadPosition.object]).toEqual(rdf.literal("test\ntest2"));
            });
        });
    });
});
