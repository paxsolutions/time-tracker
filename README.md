# Time Tracker

A comprehensive time tracking web app for freelance projects with MySQL database persistence.

## Features

- ⏱️ **Real-time Timer** - Start/stop timer with one click
- 📅 **Calendar View** - Manually enter hours for any date
- 💰 **Hourly Rates** - Set and track earnings per project
- 📊 **Weekly Summary** - View aggregated hours and earnings by week
- 🧾 **Invoice Generation** - Create and download professional invoices
- 💾 **MySQL Database** - Persistent storage with Docker
- 🎨 **Modern UI** - Clean, responsive design with TailwindCSS

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express
- **Database**: MySQL 8.0 (Docker)
- **Icons**: Lucide React

## Prerequisites

- Node.js (v18 or higher)
- Docker Desktop (for MySQL)

## Getting Started

### 1. Start the MySQL Database

```bash
# Start Docker containers
npm run docker:up

# Or manually:
docker-compose up -d
```

This will start a MySQL container with the database schema automatically initialized.

### 2. Install Backend Dependencies

```bash
cd server
npm install
cd ..
```

### 3. Install Frontend Dependencies

```bash
npm install
```

### 4. Run the Application

You'll need **two terminal windows**:

**Terminal 1 - Backend Server:**
```bash
npm run dev:server
```

The API server will start on `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Usage Guide

### Time Tracker (Timer)
1. Add a new project with name and hourly rate
2. Click "Start Timer" to begin tracking
3. Click "Stop Timer" when done - entry is saved automatically
4. Edit hourly rates anytime by clicking the pencil icon
5. View real-time earnings based on tracked hours

### Calendar View
1. Click the "Calendar" tab
2. Navigate months with arrow buttons
3. Click any day to manually add time entries
4. Enter project, hours, and minutes
5. Add optional description

### Weekly Summary
1. View aggregated data grouped by week
2. See total hours and earnings per project
3. Review weekly totals
4. Click "Generate Invoice" for any week

### Invoice Generation
1. Select a week from Weekly Summary, or
2. Go to Invoice tab and enter client details
3. Fill in client name, email, and invoice number
4. Add optional notes (payment terms, etc.)
5. Click "Download Invoice" to get HTML file

## Database Schema

### Projects Table
- `id` - Primary key
- `name` - Project name
- `hourly_rate` - Decimal rate per hour
- `created_at` / `updated_at` - Timestamps

### Time Entries Table
- `id` - Primary key
- `project_id` - Foreign key to projects
- `start_time` - Unix timestamp (ms)
- `end_time` - Unix timestamp (ms)
- `duration` - Duration in milliseconds
- `is_manual` - Boolean flag for manual entries
- `description` - Optional text description
- `created_at` - Timestamp

## Environment Variables

Backend configuration (`.env`):

```
cp server/.env.example server/.env
```

Update the `.env` file with your database credentials.

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=timetracker_user
DB_PASSWORD=timetracker_pass
DB_NAME=timetracker
PORT=3001
```

## Stopping the Application

### Stop Frontend & Backend
Press `Ctrl+C` in each terminal window

### Stop Docker Containers
```bash
npm run docker:down

# Or manually:
docker-compose down
```

### Stop and Remove Database Data
```bash
docker-compose down -v
```

## Development

### Backend API Endpoints

- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create project
- `PATCH /api/projects/:id/rate` - Update hourly rate
- `DELETE /api/projects/:id` - Delete project
- `GET /api/entries` - Get all time entries
- `POST /api/entries` - Create time entry
- `DELETE /api/entries/:id` - Delete entry
- `GET /api/timer/active` - Get active timer
- `POST /api/timer/active` - Set active timer
- `DELETE /api/timer/active` - Clear active timer

### Database Access

Connect to MySQL:
```bash
docker exec -it timetracker-mysql mysql -u timetracker_user -ptimetracker_pass timetracker
```

## Troubleshooting

### "Failed to load data" Error
- Make sure Docker is running
- Check if MySQL container is up: `docker ps`
- Verify backend server is running on port 3001
- Check backend logs for connection errors

### Port Already in Use
- Frontend (5173): Stop other Vite apps
- Backend (3001): Change PORT in `server/.env`
- MySQL (3306): Change port in `docker-compose.yml`

### Database Connection Issues
- Wait 10-20 seconds after `docker-compose up` for MySQL to initialize
- Check container health: `docker ps`
- View logs: `docker logs timetracker-mysql`

## Production Build

```bash
npm run build
```

Built files will be in the `dist/` directory.

## License

MIT
