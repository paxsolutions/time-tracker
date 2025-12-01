import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mysql from 'mysql2/promise';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection and initialize tables
pool.getConnection()
  .then(async (connection) => {
    console.log('✅ Database connected successfully');

    // Add client fields to projects table if they don't exist
    try {
      await connection.query(`
        ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS client_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS client_email VARCHAR(255)
      `);
      console.log('✅ Projects table updated with client fields');
    } catch (error) {
      // MySQL doesn't support IF NOT EXISTS for ALTER COLUMN, so we'll check differently
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'projects' AND COLUMN_NAME IN ('client_name', 'client_email')
      `, [process.env.DB_NAME]);

      if (columns.length === 0) {
        await connection.query(`
          ALTER TABLE projects
          ADD COLUMN client_name VARCHAR(255),
          ADD COLUMN client_email VARCHAR(255)
        `);
        console.log('✅ Projects table updated with client fields');
      } else {
        console.log('✅ Projects table already has client fields');
      }
    }

    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
  });

// ==================== CLIENT ROUTES ====================

// Get unique clients from projects
app.get('/api/clients', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT client_name as name, client_email as email
      FROM projects
      WHERE client_name IS NOT NULL AND client_name != ''
      ORDER BY client_name ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// ==================== PROJECT ROUTES ====================

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Create a new project
app.post('/api/projects', async (req, res) => {
  try {
    const { name, hourlyRate, clientName, clientEmail } = req.body;
    const [result] = await pool.query(
      'INSERT INTO projects (name, hourly_rate, client_name, client_email) VALUES (?, ?, ?, ?)',
      [name, hourlyRate || 0, clientName || null, clientEmail || null]
    );

    const [newProject] = await pool.query(
      'SELECT * FROM projects WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newProject[0]);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update a project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, hourlyRate } = req.body;

    await pool.query(
      'UPDATE projects SET name = ?, hourly_rate = ? WHERE id = ?',
      [name, hourlyRate, id]
    );

    const [updatedProject] = await pool.query(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );

    res.json(updatedProject[0]);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Update project rate only
app.patch('/api/projects/:id/rate', async (req, res) => {
  try {
    const { id } = req.params;
    const { hourlyRate } = req.body;

    await pool.query(
      'UPDATE projects SET hourly_rate = ? WHERE id = ?',
      [hourlyRate, id]
    );

    const [updatedProject] = await pool.query(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );

    res.json(updatedProject[0]);
  } catch (error) {
    console.error('Error updating project rate:', error);
    res.status(500).json({ error: 'Failed to update project rate' });
  }
});

// Delete a project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM projects WHERE id = ?', [id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// ==================== TIME ENTRY ROUTES ====================

// Get all time entries
app.get('/api/entries', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM time_entries ORDER BY start_time DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Create a new time entry
app.post('/api/entries', async (req, res) => {
  try {
    const { projectId, startTime, endTime, duration, isManual, description } = req.body;

    const [result] = await pool.query(
      'INSERT INTO time_entries (project_id, start_time, end_time, duration, is_manual, description) VALUES (?, ?, ?, ?, ?, ?)',
      [projectId, startTime, endTime, duration, isManual || false, description || null]
    );

    const [newEntry] = await pool.query(
      'SELECT * FROM time_entries WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newEntry[0]);
  } catch (error) {
    console.error('Error creating entry:', error);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// Update a time entry
app.put('/api/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId, startTime, endTime, duration, description } = req.body;

    await pool.query(
      'UPDATE time_entries SET project_id = ?, start_time = ?, end_time = ?, duration = ?, description = ? WHERE id = ?',
      [projectId, startTime, endTime, duration, description || null, id]
    );

    const [updatedEntry] = await pool.query(
      'SELECT * FROM time_entries WHERE id = ?',
      [id]
    );

    res.json(updatedEntry[0]);
  } catch (error) {
    console.error('Error updating entry:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// Delete a time entry
app.delete('/api/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM time_entries WHERE id = ?', [id]);
    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// ==================== ACTIVE TIMER ROUTES ====================

// Store active timer in memory (could be moved to Redis for production)
let activeTimer = null;

app.get('/api/timer/active', (req, res) => {
  res.json(activeTimer);
});

app.post('/api/timer/active', (req, res) => {
  activeTimer = req.body;
  res.json(activeTimer);
});

app.delete('/api/timer/active', (req, res) => {
  activeTimer = null;
  res.json({ message: 'Active timer cleared' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
