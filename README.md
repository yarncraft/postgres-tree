# Postgres Tree

[![npm version](https://badge.fury.io/js/postgres-tree.svg)](https://badge.fury.io/js/postgres-tree)

<a data-flickr-embed="true" href="https://www.flickr.com/photos/from_drawing/6322716054/in/photolist-aCHzcL-DPU3YJ-81mjzW-NZhnUL-rDUy3G-dv8HZA-e19geU-oCn8Fa-4oSDcd-RdK8W2-tyNyqo-dtTqbL-pFzCMg-breddn-CbAH2U-dpe8LG-3bnU7-5Z2dpD-oo9ZQk-CtaKr3-5DrQYY-bG5YVB-9pFqgG-a5CzhP-o3Jgwz-pq6cGg-7Mc1xt-4Lhe5a-7pb3gy-aMvFoi-CNzjgt-9JrLPy-7M4JhB-7KjC9q-7SC5Xg-9SkhAw-4jgLhB-97FKa2-jG1hH9-b7k7tc-q41mqn-mp6FSx-4gJbZf-9e5C7N-4KsG5Z-dwptEU-5Lf3QB-9VCXW5-62nymB-oovWDm" title="melt tree"><img src="https://live.staticflickr.com/6099/6322716054_ee5c442dda_w.jpg" width="186" height="240" alt="melt tree" align='right'></a>

An implementation of flexible trees in Postgres

In your root you must have the following environment variables in a .env \
This way node-postgres will set itself up automatically.

```env
PGUSER=testuser
PGHOST=localhost
PGPASS=password
PGDB=testuser
PGPORT=5432
```

Install the package with: `npm install postgres-tree`

Next, you can work with the API as follows:

```javascript
const PostgresTree = require("postgres-tree").default;

(async () => {
  /* construct the table in the DB and expose an API (when the table already exists, skip the build) */
  const tree = await new PostgresTree("nodetree").build();

  await tree.addNode({
    id: 1,
    parent: null,
    name: "Node1",
    offset: 0
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

  /* insert a node and inherit its parents children */
  await tree.replacingInsertNode({
    id: 4,
    parent: 1,
    name: "Node4",
    offset: 0
  });
  await tree.replacingInsertNode({
    id: 5,
    parent: 4,
    name: "Node5",
    offset: 0
  });

  /* get all leaves of the tree */
  const leaves = await tree.getLeaves();
  console.log(leaves);
  /*
  [
    { id: 2, parent_id: 5, name: 'Node2', ofset: 0 },
    { id: 3, parent_id: 5, name: 'Node3', ofset: 0 }
  ]
  */

  /* get all leaves of the tree */
  const roots = await tree.getRoots();
  console.log(roots);
  /*
  [ { id: 1, name: 'Node1', ofset: 0 } ]
  */

  /* get all descendants (= subtree) of a given node */
  const descendants = await tree.getDescendants(1);
  console.log(descendants);
  /*
  [
    { id: 4, parent_id: 1, name: 'Node4', ofset: 0, depth: 2 },
    { id: 5, parent_id: 4, name: 'Node5', ofset: 0, depth: 3 },
    { id: 2, parent_id: 5, name: 'Node2', ofset: 0, depth: 4 },
    { id: 3, parent_id: 5, name: 'Node3', ofset: 0, depth: 4 }
  ]
  */

  /* get all ancestors of a given node */
  const ancestors = await tree.getAncestors(3);
  console.log(ancestors);
  /*
  [
    { id: 5, parent_id: 4, name: 'Node5', depth: -1 },
    { id: 4, parent_id: 1, name: 'Node4', depth: -2 },
    { id: 1, parent_id: null, name: 'Node1', depth: -3 }
  ]
  */

  /* create a view of the ancestor relationships */
  await tree.createView();

  /* observe the view */
  const view = await tree.view();
  console.log(view);
  /*
  [
    { id: 1, ancestors: [], depth: 0, cycle: false },
    { id: 4, ancestors: [ 1 ], depth: 1, cycle: false },
    { id: 5, ancestors: [ 1, 4 ], depth: 2, cycle: false },
    { id: 2, ancestors: [ 1, 4, 5 ], depth: 3, cycle: false },
    { id: 3, ancestors: [ 1, 4, 5 ], depth: 3, cycle: false }
  ]
  */

  /* move the node and its descendants to a new parent node */
  await tree.moveSubtree(3, 2);

  /* move the children of a given node to a new parent node */
  await tree.moveDescendants(2, 4);

  /* remove a node and transfer its children to its parent */
  await tree.removeNode(3);

  /* remove a node and its children */
  await tree.removeSubtree(5);

  const newView = await tree.view();
  console.log(newView);
  /*
  [
    { id: 1, ancestors: [], depth: 0, cycle: false },
    { id: 4, ancestors: [ 1 ], depth: 1, cycle: false }
  ]
  */

  /* remove the table and its view from the database*/
  await tree.destroy();
})().catch(err => {
  console.error(err);
});
```

I've implemented the tree methods with Common Table Expressions (CTEs) and the classical Adjacency List / Closure Table approach. It serves as an alternative for the ltree datatype which Postgres natively supports.
