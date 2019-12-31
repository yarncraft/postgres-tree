"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _instanceof(left, right) {
  if (
    right != null &&
    typeof Symbol !== "undefined" &&
    right[Symbol.hasInstance]
  ) {
    return !!right[Symbol.hasInstance](left);
  } else {
    return left instanceof right;
  }
}

function _classCallCheck(instance, Constructor) {
  if (!_instanceof(instance, Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

var _require = require("pg"),
  Pool = _require.Pool;

require("dotenv").config();

var PostgresTree =
  /*#__PURE__*/
  (function() {
    function PostgresTree(table) {
      _classCallCheck(this, PostgresTree);

      this.client = new Pool({
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        database: process.env.PGDB,
        password: process.env.PGPASS,
        port: process.env.PGPORT
      });
      this.table = table; // Beware of SQL Injections when exposing this to the end users
    }

    _createClass(PostgresTree, [
      {
        key: "client",
        value: function client() {
          return this.client;
        }
      },
      {
        key: "build",
        value: async function build() {
          await this.client.query(
            "\n CREATE TABLE "
              .concat(
                this.table,
                " (\n id serial PRIMARY KEY NOT NULL,\n parent_id integer,\n name varchar NOT NULL,\n ofset integer DEFAULT 0,\n FOREIGN KEY (parent_id) REFERENCES "
              )
              .concat(this.table, "(id)\n);\n  ")
          );
          return this;
        }
      },
      {
        key: "destroy",
        value: async function destroy() {
          var text = "DROP TABLE IF EXISTS ".concat(this.table, " CASCADE");

          var _ref = await this.client.query(text),
            rows = _ref.rows;

          return !rows.length;
        }
      },
      {
        key: "getDescendants",
        value: async function getDescendants(id) {
          var text = "\nWITH RECURSIVE children AS (\n SELECT id, parent_id, name, ofset, ofset as depth\n FROM "
            .concat(
              this.table,
              "\n WHERE id = $1\nUNION\n SELECT op.id, op.parent_id, op.name, op.ofset, depth + 1 + op.ofset\n FROM "
            )
            .concat(
              this.table,
              " op\n JOIN children c ON op.parent_id = c.id\n)\nSELECT *\nFROM children;"
            );
          var values = [id];

          var _ref2 = await this.client.query(text, values),
            rows = _ref2.rows;

          return rows.slice(1);
        }
      },
      {
        key: "getAncestors",
        value: async function getAncestors(id) {
          var text = "\nWITH RECURSIVE parents AS (\n SELECT id, parent_id, name, 0 as depth\n FROM "
            .concat(
              this.table,
              "\n WHERE id = $1\nUNION\n SELECT op.id, op.parent_id, op.name, depth - 1 - op.ofset\n FROM "
            )
            .concat(
              this.table,
              " op\n JOIN parents p ON op.id = p.parent_id\n)\nSELECT *\nFROM parents;"
            );
          var values = [id];

          var _ref3 = await this.client.query(text, values),
            rows = _ref3.rows;

          return rows.slice(1);
        }
      },
      {
        key: "addNode",
        value: async function addNode(_ref4) {
          var id = _ref4.id,
            parent = _ref4.parent,
            name = _ref4.name,
            offset = _ref4.offset;
          var text = "INSERT INTO ".concat(
            this.table,
            "(id, parent_id, name, ofset) VALUES($1, $2, $3, $4) RETURNING *"
          );
          var values = [id, parent, name, offset];

          var _ref5 = await this.client.query(text, values),
            rows = _ref5.rows;

          return rows[0];
        }
      },
      {
        key: "moveSubtree",
        value: async function moveSubtree(nodeId, newParentId) {
          var text = "UPDATE ".concat(
            this.table,
            " SET parent_id = $1 WHERE id = $2;"
          );
          var values = [newParentId, nodeId];

          var _ref6 = await this.client.query(text, values),
            rows = _ref6.rows;

          return !rows.length;
        }
      },
      {
        key: "moveDescendants",
        value: async function moveDescendants(nodeId, newParentId) {
          var text = "UPDATE ".concat(
            this.table,
            " SET parent_id = $1 WHERE parent_id = $2;"
          );
          var values = [newParentId, nodeId];

          var _ref7 = await this.client.query(text, values),
            rows = _ref7.rows;

          return !rows.length;
        }
        /**
         * Remove a node and transfer its children to its parent
         *
         * @param node id
         * @returns { id, parent_id, name, offset }
         * @memberof PostgresTree
         */
      },
      {
        key: "removeNode",
        value: async function removeNode(id) {
          var text = "\nWITH deleted AS (\n  DELETE FROM "
            .concat(
              this.table,
              "\n  WHERE id = $1\n  RETURNING id, parent_id\n)\nUPDATE "
            )
            .concat(
              this.table,
              "\nSET parent_id = deleted.parent_id\nFROM deleted\nWHERE "
            )
            .concat(this.table, ".parent_id = deleted.id\nRETURNING *;\n");
          var values = [id];

          var _ref8 = await this.client.query(text, values),
            rows = _ref8.rows;

          return rows;
        }
      },
      {
        key: "removeSubtree",
        value: async function removeSubtree(id) {
          this.createView();
          var text = "\nDELETE FROM "
            .concat(this.table, "\nWHERE id IN (\n  SELECT id FROM ")
            .concat(this.table + "_view", " AS t WHERE ")
            .concat(id, " = ANY(t.ancestors)\n) OR id = ")
            .concat(id, ";\n    ");

          var _ref9 = await this.client.query(text),
            rows = _ref9.rows;

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
      },
      {
        key: "insertNode",
        value: async function insertNode(_ref10, x, y) {
          var id = _ref10.id,
            name = _ref10.name,
            offset = _ref10.offset;
          var text = "\nWITH insert_node AS (\n  INSERT INTO "
            .concat(
              this.table,
              "(id, parent_id, name, ofset)\n  VALUES ($1, $2, $3, $4)\n  RETURNING id\n)\nUPDATE "
            )
            .concat(
              this.table,
              "\nSET parent_id = insert_node.id\nFROM insert_node\nWHERE "
            )
            .concat(this.table, ".id = $5;");
          var values = [id, x, name, offset, y];

          var _ref11 = await this.client.query(text, values),
            rows = _ref11.rows;

          return !rows.length;
        }
        /**
         * Insert a node and inherit its parents children
         *
         * @param node { id, parent, name, offset }
         * @returns Boolean
         * @memberof PostgresTree
         */
      },
      {
        key: "replacingInsertNode",
        value: async function replacingInsertNode(_ref12) {
          var id = _ref12.id,
            parent = _ref12.parent,
            name = _ref12.name,
            offset = _ref12.offset;
          var text = "\nWITH created_node AS (\n  INSERT INTO "
            .concat(
              this.table,
              "(id, parent_id, name, ofset)\n  VALUES ($1, $2, $3, $4)\n  RETURNING id\n)\nUPDATE "
            )
            .concat(
              this.table,
              "\nSET parent_id = created_node.id\nFROM created_node\nWHERE "
            )
            .concat(this.table, ".parent_id = $2;");
          var values = [id, parent, name, offset];

          var _ref13 = await this.client.query(text, values),
            rows = _ref13.rows;

          return !rows.length;
        }
      },
      {
        key: "getLeaves",
        value: async function getLeaves() {
          var text = "\nSELECT id, parent_id, name, ofset FROM "
            .concat(this.table, "\nWHERE id NOT IN (\n  SELECT parent_id FROM ")
            .concat(this.table, " WHERE parent_id IS NOT NULL\n);\n");

          var _ref14 = await this.client.query(text),
            rows = _ref14.rows;

          return rows;
        }
      },
      {
        key: "getRoots",
        value: async function getRoots() {
          var text = "SELECT id, name, ofset FROM ".concat(
            this.table,
            " WHERE parent_id IS NULL;"
          );

          var _ref15 = await this.client.query(text),
            rows = _ref15.rows;

          return rows;
        }
      },
      {
        key: "createView",
        value: async function createView() {
          var text = "\nCREATE OR REPLACE RECURSIVE VIEW "
            .concat(
              this.table + "_view",
              " (id, ancestors, depth, cycle) AS (\n    SELECT id, '{}'::integer[], 0, FALSE\n    FROM "
            )
            .concat(
              this.table,
              " WHERE parent_id IS NULL\n  UNION ALL\n    SELECT\n      n.id, t.ancestors || n.parent_id, t.depth + 1 + n.ofset,\n      n.parent_id = ANY(t.ancestors)\n    FROM "
            )
            .concat(this.table, " n, ")
            .concat(
              this.table + "_view",
              " t\n    WHERE n.parent_id = t.id\n    AND NOT t.cycle\n);\n"
            );
          await this.client.query(text);

          var _ref16 = await this.client.query(
              "SELECT id, ancestors, depth FROM ".concat(
                this.table + "_view",
                ";"
              )
            ),
            rows = _ref16.rows;

          return rows;
        }
      },
      {
        key: "view",
        value: async function view() {
          var _ref17 = await this.client.query(
              "SELECT id, ancestors, depth FROM ".concat(
                this.table + "_view",
                ";"
              )
            ),
            rows = _ref17.rows;

          return rows;
        }
      }
    ]);

    return PostgresTree;
  })();

exports.default = PostgresTree;
