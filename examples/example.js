/* eslint-disable no-console */
/* Make sure to have node-postgres installed with yarn add pg */
const PostgresTree = require("../lib").default;

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

  /* get all leaves of the tree */
  const roots = await tree.getRoots();
  console.log(roots);

  /* get all descendants (= subtree) of a given node */
  const descendants = await tree.getDescendants(1);
  console.log(descendants);

  /* get all ancestors of a given node */
  const ancestors = await tree.getAncestors(3);
  console.log(ancestors);

  /* create a view of the ancestor relationships */
  await tree.createView();

  /* observe the view */
  const view = await tree.view();
  console.log(view);

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

  /* remove the table and its view from the database*/
  await tree.destroy();
})().catch(err => {
  console.error(err);
});
