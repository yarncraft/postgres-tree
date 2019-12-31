# Postgres Tree

[![NPM](https://nodei.co/npm/postgres-tree.png)](https://nodei.co/npm/postgres-tree/)

<a data-flickr-embed="true" href="https://www.flickr.com/photos/from_drawing/6322716054/in/photolist-aCHzcL-DPU3YJ-81mjzW-NZhnUL-rDUy3G-dv8HZA-e19geU-oCn8Fa-4oSDcd-RdK8W2-tyNyqo-dtTqbL-pFzCMg-breddn-CbAH2U-dpe8LG-3bnU7-5Z2dpD-oo9ZQk-CtaKr3-5DrQYY-bG5YVB-9pFqgG-a5CzhP-o3Jgwz-pq6cGg-7Mc1xt-4Lhe5a-7pb3gy-aMvFoi-CNzjgt-9JrLPy-7M4JhB-7KjC9q-7SC5Xg-9SkhAw-4jgLhB-97FKa2-jG1hH9-b7k7tc-q41mqn-mp6FSx-4gJbZf-9e5C7N-4KsG5Z-dwptEU-5Lf3QB-9VCXW5-62nymB-oovWDm" title="melt tree"><img src="https://live.staticflickr.com/6099/6322716054_ee5c442dda_w.jpg" width="226" height="300" alt="melt tree" align='right'></a>

An implementation of flexible trees in Postgres

## Hands-on example

In your root you must have the following environment variables in a .env \
This way node-postgres will set itself up automatically.

```env
PGUSER=testuser
PGHOST=localhost
PGPASS=password
PGDB=testuser
PGPORT=5432
```

Install the package with: `npm i postgres-tree`

Next, you can start growing trees as follows:

```javascript
const PostgresTree = require("postgres-tree").default;

(async () => {
  /* construct the table in the DB and expose an API */
  const tree = await new PostgresTree("nodetree").build();

  await tree.addNode({
    id: 1,
    parent: null,
    name: "Node1",
    offset: 10
  });
  await tree.addNode({
    id: 2,
    parent: 1,
    name: "Node2",
    offset: 0
  });
  await tree.addNode({
    id: 3,
    parent: 1,
    name: "Node3",
    offset: 0
  });
  /*
   * .
   * └── 1
   *     ├── 2
   *     └── 3
   */

  await tree.insertNode(
    {
      id: 4,
      name: "Node4",
      offset: 0
    },
    1,
    2
  );
  /*
   * .
   * └── 1
   *     ├── 4 ── 2
   *     └── 3
   */

  await tree.replacingInsertNode({
    id: 5,
    parent: 1,
    name: "Node5",
    offset: 0
  });
  /*
   * .
   * └── 1
   *     └── 5
   *         ├── 4 ── 2
   *         └── 3
   */

  await tree.moveSubtree(5, null);
  /*
   * .
   * └── 1
   * └── 5
   *     ├── 4 ── 2
   *     └── 3
   */

  const leaves = await tree.getLeaves();
  console.log(leaves);
  /*
  [
    { id: 1, parent_id: null, name: 'Node1', ofset: 10 },
    { id: 2, parent_id: 4, name: 'Node2', ofset: 0 },
    { id: 3, parent_id: 5, name: 'Node3', ofset: 0 }
  ]
  */

  const roots = await tree.getRoots();
  console.log(roots);
  /*
  [
    { id: 1, name: 'Node1', ofset: 10 },
    { id: 5, name: 'Node5', ofset: 0 }
  ]
  */

  await tree.createView();

  const view = await tree.view();
  console.log(view);
  /*
  [
    { id: 1, ancestors: [], depth: 0 },
    { id: 5, ancestors: [], depth: 0 },
    { id: 3, ancestors: [ 5 ], depth: 1 },
    { id: 4, ancestors: [ 5 ], depth: 1 },
    { id: 2, ancestors: [ 5, 4 ], depth: 2 }
  ]
  */

  await tree.destroy();
})().catch(err => {
  console.error(err);
});
```

## DSL Interface

```js
class PostgresTree {
  constructor(table) {
    this.client = new Pool({
      user: process.env.PGUSER,
      host: process.env.PGHOST,
      database: process.env.PGDB,
      password: process.env.PGPASS,
      port: process.env.PGPORT
    });
    this.table = table;
  }
}
```

```js
/**
 * Get the postgres Pool client
 *
 * @returns the pg Pool object
 * @memberof PostgresTree
 */
client();
```

```js
/**
 * Build (CREATE) the table in the database
 *
 * @returns the PostgresTree class
 * @memberof PostgresTree
 */
build();
```

```js
/**
 * Destroy (DELETE) the table in the database
 *
 * @returns {Bool} true when deleted, false otherwise
 * @memberof PostgresTree
 */
destroy();
```

```js
/**
 * Given a the id of a node, get all its descendants
 *
 * @param {Int} id
 * @returns {Array[Node]} the array of Node objects
 * @memberof PostgresTree
 */
async getDescendants(id)
```

```js
/**
 * Given a the id of a node, get all its ancestors
 *
 * @param {Int} id
 * @returns {Array[Node]} the array of Node objects
 * @memberof PostgresTree
 */
async getAncestors(id)
```

```js
/**
 * Add a Node to the tree given its id, parentId, name and offset*
 *
 * @param {Object} { id, parent, name, offset } (= Node)
 * @returns
 * @memberof PostgresTree
 */
async addNode({ id, parent, name, offset })
```

```js
/**
 * Move a node and its descendants to a newParentId
 *
 * @param {Int} nodeId
 * @param {Int} newParentId
 * @returns {Bool} true when succeeded, false otherwise
 * @memberof PostgresTree
 */
async moveSubtree(nodeId, newParentId)
```

```js
/**
 * Move a nodeId's descendants to a newParentId
 *
 * @param {Int} nodeId
 * @param {Int} newParentId
 * @returns {Bool} true when succeeded, false otherwise
 * @memberof PostgresTree
 */
async moveDescendants(nodeId, newParentId)
```

```js
/**
 * Remove a node and transfer its children to its parent
 *
 * @param {Int} id
 * @returns {Node} the removed Node
 * @memberof PostgresTree
 */
async removeNode(id)
```

```js
/**
 * Remove a node and its descendants
 *
 * @param {Int} id
 * @returns {Bool} true when succeeded, false otherwise
 * @memberof PostgresTree
 */
async removeNode(id)
```

```js
  /**
   * Insert a node between node X and Y
   *
   * @param {Node} { id, name, offset }
   * @param {Int} x
   * @param {Int} y
   * @returns {Bool} true when succeeded, false otherwise
   * @memberof PostgresTree
   */
  async insertNode({ id, name, offset }, x, y)
```

```js
  /**
   * Insert a node and inherit its parents children
   *
   * @param {Node} { id, parent, name, offset }
   * @returns {Bool} true when succeeded, false otherwise
   * @memberof PostgresTree
   */
  async replacingInsertNode({ id, parent, name, offset })
```

```js
/**
 * Get all leaves of the tree
 *
 * @returns {Array[Node]} the array of Node objects
 * @memberof PostgresTree
 */
  async getLeaves()
```

```js
/**
 * Get all roots of the tree
 *
 * @returns {Array[Node]} the array of Node objects
 * @memberof PostgresTree
 */
  async getRoots()
```

```js
/**
 * Create an ancestral view of the tree
 *
 * @returns {Array[{id, [NodeId], depth}]}
 * @memberof PostgresTree
 */
  async createView()
```

```js
/**
 * Get the ancestral view of the tree
 *
 * @returns {Array[{id, [NodeId], depth}]}
 * @memberof PostgresTree
 */
  async view()
```

_I've implemented the tree methods with Common Table Expressions (CTEs) and the classical Adjacency List / Closure Table approach. It serves as an alternative for the ltree datatype which Postgres natively supports._

**Offset is a reserved keyword in SQL so I opted for ofset as the column-name instead.**
