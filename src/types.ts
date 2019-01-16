import { NamedNode, Node, SomeNode, SomeTerm } from "rdflib";

export type Quadruple = [SomeNode, NamedNode, SomeTerm, Node];
