// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)
// import "core-js/fn/array.find"
// ...
import {
  ASTKindToNode,
  concatAST,
  DirectiveNode,
  FragmentDefinitionNode,
  Kind,
  NameNode,
  DocumentNode,
  SelectionSetNode,
  ValueNode,
  visit,
  Visitor,
  GraphQLSchema,
} from 'graphql';

interface Document {
  filePath: string;
  content: DocumentNode;
}

interface ValidationNode {
  readonly kind: string;
  readonly alias?: NameNode;
  readonly name?: NameNode;
  readonly directives?: readonly DirectiveNode[];
  readonly selectionSet?: SelectionSetNode;
}

// decide on JSON schema version and get type for it
type JSONSchema = any;

type NodeValue = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  number|string|boolean|null|Record<string, any>|
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (number|string|boolean|null|Record<string, any>)[]
)

const VALIDATE = 'validate';

const getValidateDirective = (directives: readonly DirectiveNode[]): DirectiveNode | null => {
  const result = directives.filter((d): boolean => d.name.value === VALIDATE);
  if (result.length) {
    return result[0];
  }
  return null;
};

type NodeValueRecord = Record<string, NodeValue>;

const getDirectiveValue = (node: ValueNode): NodeValue => {
  if (node.kind === 'Variable') {
    // we may want to modify the final function signature
    // to take an extra object with variables inside of it
    // but I'm not sure there's a use case for dynamically
    // creating json schema variables this way
    throw new Error('Variables are not allowed as validation values');
  }
  if (node.kind === 'IntValue') {
    return Number.parseInt(node.value, 10);
  }
  if (node.kind === 'FloatValue') {
    return Number.parseFloat(node.value);
  }
  if (node.kind === 'StringValue') {
    return node.value;
  }
  if (node.kind === 'BooleanValue') {
    return node.value;
  }
  if (node.kind === 'NullValue') {
    return null;
  }
  if (node.kind === 'EnumValue') {
    return node.value;
  }
  if (node.kind === 'ListValue') {
    return node.values.map(getDirectiveValue);
  }
  if (node.kind === 'ObjectValue') {
    return node.fields.reduce((acc: NodeValueRecord, f): NodeValueRecord => {
      acc[f.name.value] = getDirectiveValue(f.value);
      return acc;
    }, {});
  }
  throw new Error('Unable to determine type of validation argument value');
};

export const createSchema = (
  node: ValidationNode, fragments: FragmentDefinitionNode[],
): JSONSchema => {
  const directive = getValidateDirective(node.directives || []);
  // handle when name isn't preset on initial operation node
  const jsonSchema: JSONSchema = {};
  // const name = (node.alias && node.alias.value) || (node.name && node.name.value) || ""
  if (directive && directive.arguments) {
    directive.arguments.forEach((a): void => {
      jsonSchema[a.name.value] = getDirectiveValue(a.value);
    });
  }
  if (node.selectionSet) {
    node.selectionSet.selections.forEach((n): void => {
      if (!jsonSchema.properties) {
        jsonSchema.properties = {};
      }
      if (n.kind === 'Field' && n.directives) {
        jsonSchema.properties[n.name.value] = createSchema(n, fragments);
      }
      if ((n.kind === 'FragmentSpread') && n.directives) {
        const fragment = fragments.find((f): boolean => f.name.value === n.name.value);
        if (fragment) {
          jsonSchema.properties = createSchema(fragment, fragments).properties;
        }
      }
    });
  }
  return jsonSchema;
};

export const plugin = (schema: GraphQLSchema, documents: Document[]): string => {
  const ast = concatAST(
    documents.reduce<DocumentNode[]>((prev, v): DocumentNode[] => [...prev, v.content], []),
  );
  const allFragments = ast.definitions.filter(
    (d): boolean => d.kind === Kind.FRAGMENT_DEFINITION,
  ) as FragmentDefinitionNode[];

  const visitor: Visitor<ASTKindToNode> = {
    OperationDefinition: (node): string => {
      if (!node.name) {
        throw new Error('Anonymous operations are not supported');
      }
      const jsonSchema = createSchema(node, allFragments);
      const name = node.name.value;
      const validator = `${name}Validator`;
      const capitalName = `${name[0].toUpperCase()}${name.slice(1)}`;
      return `
        const ${validator} = ajv.compile(${JSON.stringify(jsonSchema, null, 2)});
        export function validate${capitalName} (data: any) {
          const valid = ${validator}(data);
          return [valid, ${validator}.errors]
        }
      `;
    },
  };

  const globals = `
    import * as Ajv from 'ajv';
    const ajv = new Ajv();

  `;

  const { definitions } = visit(ast, visitor);
  const result = definitions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((d: any): boolean => typeof d === 'string')
    .join('\n');
  return globals + result;
};
