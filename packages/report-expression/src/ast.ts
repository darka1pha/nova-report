export type ASTNode =
  | LiteralNode
  | IdentifierNode
  | MemberNode
  | BinaryNode
  | UnaryNode
  | ConditionalNode
  | CallNode
  | ArrayNode;

export interface LiteralNode {
  type: 'Literal';
  value: string | number | boolean | null;
}

export interface IdentifierNode {
  type: 'Identifier';
  name: string;
}

export interface MemberNode {
  type: 'Member';
  object: ASTNode;
  property: string;
  computed?: boolean;
}

export interface BinaryNode {
  type: 'Binary';
  operator: '+' | '-' | '*' | '/' | '%' | '==' | '!=' | '===' | '!==' | '<' | '<=' | '>' | '>=' | '&&' | '||';
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryNode {
  type: 'Unary';
  operator: '+' | '-' | '!';
  argument: ASTNode;
}

export interface ConditionalNode {
  type: 'Conditional';
  test: ASTNode;
  consequent: ASTNode;
  alternate: ASTNode;
}

export interface CallNode {
  type: 'Call';
  callee: string;
  args: ASTNode[];
}

export interface ArrayNode {
  type: 'Array';
  elements: ASTNode[];
}
