const fs = require("fs");
const path = require("path");
const oracledb = require("oracledb");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];

const getConfig = () => {
  const { ORACLE_USER, ORACLE_PASSWORD, ORACLE_CONNECT_STRING } = process.env;
  if (!ORACLE_USER || !ORACLE_PASSWORD || !ORACLE_CONNECT_STRING) {
    throw new Error(
      "Missing ORACLE_USER, ORACLE_PASSWORD, or ORACLE_CONNECT_STRING."
    );
  }
  return {
    user: ORACLE_USER,
    password: ORACLE_PASSWORD,
    connectString: ORACLE_CONNECT_STRING,
  };
};

const splitSqlStatements = (sql) =>
  sql
    .split(/;\s*$/m)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

const executeSqlFile = async (connection, filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const sql = fs.readFileSync(filePath, "utf8");
  const statements = splitSqlStatements(sql);
  for (const statement of statements) {
    await connection.execute(statement);
  }
};

const main = async () => {
  const config = getConfig();
  const connection = await oracledb.getConnection(config);
  try {
    const schemaPath = path.join(__dirname, "..", "db", "schema.oracle.sql");
    const seedPath = path.join(__dirname, "..", "db", "seed.oracle.sql");

    await executeSqlFile(connection, schemaPath);
    await executeSqlFile(connection, seedPath);
    await connection.commit();
    console.log("Oracle schema/seed applied.");
  } finally {
    await connection.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
