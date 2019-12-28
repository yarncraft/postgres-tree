/* eslint-disable no-console */
/* Make sure to have node-postgres installed with yarn add pg */
const PostgresTree = require("../lib").default;

(async () => {
  const tree = await new PostgresTree("testing").build();

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
    parent: 2,
    name: "Node3",
    offset: 0
  });
  await tree.addNode({
    id: 4,
    parent: 3,
    name: "Node4",
    offset: 0
  });
  await tree.addNode({
    id: 5,
    parent: 3,
    name: "Node5",
    offset: 10
  });
  const descendants = await tree.getDescendants(1);
  console.log(descendants);
  const view = await tree.createView();
  console.log(view);
  tree.destroy();
})().catch(err => {
  console.error(err);
});
