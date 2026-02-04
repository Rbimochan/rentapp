import oracledb from "oracledb";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];

let pool: oracledb.Pool | null = null;

type OraclePoolConfig = {
  user: string;
  password: string;
  connectString: string;
  poolMin?: number;
  poolMax?: number;
  poolIncrement?: number;
};

const getPoolConfig = (): OraclePoolConfig => {
  const { ORACLE_USER, ORACLE_PASSWORD, ORACLE_CONNECT_STRING } = process.env;

  if (!ORACLE_USER || !ORACLE_PASSWORD || !ORACLE_CONNECT_STRING) {
    throw new Error(
      "Missing ORACLE_USER, ORACLE_PASSWORD, or ORACLE_CONNECT_STRING environment variables."
    );
  }

  return {
    user: ORACLE_USER,
    password: ORACLE_PASSWORD,
    connectString: ORACLE_CONNECT_STRING,
    poolMin: Number(process.env.ORACLE_POOL_MIN || 1),
    poolMax: Number(process.env.ORACLE_POOL_MAX || 10),
    poolIncrement: Number(process.env.ORACLE_POOL_INCREMENT || 1),
  };
};

export const initOraclePool = async (): Promise<oracledb.Pool> => {
  if (pool) {
    return pool;
  }

  const config = getPoolConfig();
  pool = await oracledb.createPool(config);
  return pool;
};

export const getOracleConnection = async (): Promise<oracledb.Connection> => {
  if (!pool) {
    await initOraclePool();
  }
  return pool!.getConnection();
};

export const closeOraclePool = async (): Promise<void> => {
  if (pool) {
    await pool.close(0);
    pool = null;
  }
};

export const withOracleConnection = async <T>(
  fn: (connection: oracledb.Connection) => Promise<T>
): Promise<T> => {
  const connection = await getOracleConnection();
  try {
    return await fn(connection);
  } finally {
    await connection.close();
  }
};

export const withOracleTransaction = async <T>(
  fn: (connection: oracledb.Connection) => Promise<T>
): Promise<T> => {
  const connection = await getOracleConnection();
  try {
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
};
