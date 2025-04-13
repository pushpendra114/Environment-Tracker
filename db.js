import mysql from 'mysql2/promise';

export async function connectToDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'NDA152@p',
      database: 'environmenttracker'
    });
    console.log('Connected to MySQL database!');
    return connection;
  } catch (error) {
    console.error('Error connecting to MySQL:', error);
    throw error;
  }
}

export async function executeQuery(connection, query, values) {
  try {
    const [rows, fields] = await connection.execute(query, values);
    return rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}

