import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'TIN_PROJEKT',
    password: 'postprocesing',
    port: 5432,
});

pool.connect((err) => {
    if (err) {
        console.error('Błąd połączenia z PostgreSQL:', err.message);
        return;
    }
    console.log('Połączono z bazą danych PostgreSQL.');
});

export default pool;