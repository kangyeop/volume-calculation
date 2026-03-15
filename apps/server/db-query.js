const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'wms'
  });

  try {
    const [projects] = await connection.execute('SELECT * FROM projects').catch(() => [[]]);
    console.log(`Found ${projects.length} projects.`);
    
    // Insert them into outbound_batches
    if (projects.length > 0) {
       for (const p of projects) {
          try {
             const newName = `20260315-migrated-${p.id.substring(0,4)}`;
             await connection.execute(
                 'INSERT IGNORE INTO outbound_batches (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
                 [p.id, newName, p.createdAt || new Date(), p.updatedAt || new Date()]
             );
          } catch(e) {
             console.error(`Error inserting ${p.id}:`, e.message);
          }
       }
       console.log('Migrated projects to outbound_batches.');
    } else {
       console.log('No projects to migrate.');
    }
  } catch (error) {
    console.error(error);
  } finally {
    await connection.end();
  }
}

main();
