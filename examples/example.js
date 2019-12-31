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

  await tree.insertNode(
    {
      id: 4,
      name: "Node4",
      offset: 0
    },
    1,
    2
  );

  await tree.replacingInsertNode({
    id: 5,
    parent: 1,
    name: "Node5",
    offset: 0
  });

  await tree.moveSubtree(5, null);

  const leaves = await tree.getLeaves();
  console.log(leaves);

  const roots = await tree.getRoots();
  console.log(roots);

  await tree.createView();

  const view = await tree.view();
  console.log(view);

  await tree.destroy();
})().catch(err => {
  console.error(err);
});
