# Postgres Tree

An implementation of flexible adjancency trees in Postgres

In your root you must have the following environment variables in a .env
_This way node-postgres will set itself up automatically._

```env
PGUSER=testuser
PGHOST=localhost
PGPASS=password
PGDB=testuser
PGPORT=5432
```

Next, you can work with the API as follows:

```javascript
const PostgresTree = require("postgres-tree").default;

(async () => {
  /* construct the table in the DB and expose an API */
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

  /* Insert a node and inherit its parents children */
  await tree.replaceInsertNode({
    id: 4,
    parent: 1,
    name: "Node4",
    offset: 0
  });

  /* get all leaves of the tree */
  const leaves = await tree.getLeaves();

  /* get all descendants (= subtree) of a given node */
  const descendants = await tree.getDescendants(1);

  /* get all ancestors of a given node */
  const ancestors = await tree.getAncestors(3);

  /* remove a node and transfer its children to its parent */
  await tree.removeNode(3);

  /* remove a node and its children */
  await tree.removeSubtree(4);

  /* create a view of the ancestor relationships */
  const view = await tree.createView();

  /* remove the table and its view from the database*/
  await tree.destroy();
})().catch(err => {
  console.error(err);
});
```
