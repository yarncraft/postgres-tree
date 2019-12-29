const { Pool } = require("pg");
require("dotenv").config();

export default class PostgresTree {
  constructor(table) {
    this.client = new Pool({
      user: process.env.PGUSER,
      host: process.env.PGHOST,
      database: process.env.PGDB,
      password: process.env.PGPASS,
      port: process.env.PGPORT
    });
    this.table = table; // Beware of SQL Injections when exposing this to the end users
  }

  client() {
    return this.client;
  }

  async build() {
    await this.client.query(
      `
 CREATE TABLE ${this.table} (
 id serial PRIMARY KEY NOT NULL,
 parent_id integer,
 name varchar NOT NULL,
 ofset integer DEFAULT 0,
 FOREIGN KEY (parent_id) REFERENCES ${this.table}(id)
);
  `
    );
    return this;
  }

  async destroy() {
    const text = `DROP TABLE IF EXISTS ${this.table} CASCADE`;
    const { rows } = await this.client.query(text);
    return !rows.length;
  }

  async getDescendants(id) {
    const text = `
WITH RECURSIVE children AS (
 SELECT id, parent_id, name, ofset, 1 as depth
 FROM ${this.table}
 WHERE id = $1
UNION
 SELECT op.id, op.parent_id, op.name, op.ofset, depth + 1 + op.ofset
 FROM ${this.table} op
 JOIN children c ON op.parent_id = c.id
)
SELECT *
FROM children;`;
    const values = [id];
    const { rows } = await this.client.query(text, values);
    return rows.slice(1);
  }

  async getAncestors(id) {
    const text = `
WITH RECURSIVE parents AS (
 SELECT id, parent_id, name, 0 as depth
 FROM ${this.table}
 WHERE id = $1
UNION
 SELECT op.id, op.parent_id, op.name, depth - 1 - op.ofset
 FROM ${this.table} op
 JOIN parents p ON op.id = p.parent_id
)
SELECT *
FROM parents;`;
    const values = [id];
    const { rows } = await this.client.query(text, values);
    return rows.slice(1);
  }

  async addNode({ id, parent, name, offset }) {
    const text = `INSERT INTO ${this.table}(id, parent_id, name, ofset) VALUES($1, $2, $3, $4) RETURNING *`;
    const values = [id, parent, name, offset];
    const { rows } = await this.client.query(text, values);
    return rows[0];
  }

  async moveSubtree(nodeId, newParentId) {
    const text = `UPDATE ${this.table} SET parent_id = $1 WHERE id = $2;`;
    const values = [newParentId, nodeId];
    const { rows } = await this.client.query(text, values);
    return !rows.length;
  }

  async moveDescendants(nodeId, newParentId) {
    const text = `UPDATE ${this.table} SET parent_id = $1 WHERE parent_id = $2;`;
    const values = [newParentId, nodeId];
    const { rows } = await this.client.query(text, values);
    return !rows.length;
  }

  /**
   * Remove a node and transfer its children to its parent
   *
   * @param node id
   * @returns { id, parent_id, name, offset }
   * @memberof PostgresTree
   */
  async removeNode(id) {
    const text = `
WITH deleted AS (
  DELETE FROM ${this.table}
  WHERE id = $1
  RETURNING id, parent_id
)
UPDATE ${this.table}
SET parent_id = deleted.parent_id
FROM deleted
WHERE ${this.table}.parent_id = deleted.id
RETURNING *;
`;
    const values = [id];
    const { rows } = await this.client.query(text, values);
    return rows;
  }

  async removeSubtree(id) {
    this.createView();
    const text = `
DELETE FROM ${this.table}
WHERE id IN (
  SELECT id FROM ${this.table + "_view"} AS t WHERE ${id} = ANY(t.ancestors)
) OR id = ${id};
    `;
    const { rows } = await this.client.query(text);
    return !rows.length;
  }

  /**
   * Insert a node between node X and Y
   *
   * @param node: { id, name, offset }
   * @param x: id
   * @param y: id
   * @returns Boolean, whether if the operation succeeded
   * @memberof PostgresTree
   */
  async insertNode({ id, name, offset }, x, y) {
    const text = `
WITH insert_node AS (
  INSERT INTO ${this.table}(id, parent_id, name, ofset)
  VALUES ($1, $2, $3, $4)
  RETURNING id
)
UPDATE ${this.table}
SET parent_id = insert_node.id
FROM insert_node
WHERE ${this.table}.id = $5;`;
    const values = [id, x, name, offset, y];
    const { rows } = await this.client.query(text, values);
    return !rows.length;
  }

  /**
   * Insert a node and inherit its parents children
   *
   * @param node { id, parent, name, offset }
   * @returns Boolean
   * @memberof PostgresTree
   */
  async replacingInsertNode({ id, parent, name, offset }) {
    const text = `
WITH created_node AS (
  INSERT INTO ${this.table}(id, parent_id, name, ofset)
  VALUES ($1, $2, $3, $4)
  RETURNING id
)
UPDATE ${this.table}
SET parent_id = created_node.id
FROM created_node
WHERE ${this.table}.parent_id = $2;`;
    const values = [id, parent, name, offset];
    const { rows } = await this.client.query(text, values);
    return !rows.length;
  }

  async getLeaves() {
    const text = `
SELECT id, parent_id, name, ofset FROM ${this.table}
WHERE id NOT IN (
  SELECT parent_id FROM ${this.table} WHERE parent_id IS NOT NULL
);
`;
    const { rows } = await this.client.query(text);
    return rows;
  }

  async getRoots() {
    const text = `SELECT id, name, ofset FROM ${this.table} WHERE parent_id IS NULL;`;
    const { rows } = await this.client.query(text);
    return rows;
  }

  async createView() {
    const text = `
CREATE OR REPLACE RECURSIVE VIEW ${this.table +
      "_view"} (id, ancestors, depth, cycle) AS (
    SELECT id, '{}'::integer[], 0, FALSE
    FROM ${this.table} WHERE parent_id IS NULL
  UNION ALL
    SELECT
      n.id, t.ancestors || n.parent_id, t.depth + 1,
      n.parent_id = ANY(t.ancestors)
    FROM ${this.table} n, ${this.table + "_view"} t
    WHERE n.parent_id = t.id
    AND NOT t.cycle
);
`;
    await this.client.query(text);
    const { rows } = await this.client.query(
      `SELECT * FROM ${this.table + "_view"};`
    );
    return rows;
  }

  async view() {
    const { rows } = await this.client.query(
      `SELECT * FROM ${this.table + "_view"};`
    );
    return rows;
  }
}
