# Panggung Lokal

Platform untuk menghubungkan band dan musisi lokal Indonesia dengan penyelenggara acara.

## Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- npm atau yarn

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
createdb panggung_lokal
```

Or using psql:

```sql
CREATE DATABASE panggung_lokal;
```

### 3. Environment Configuration

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Update database credentials and other configuration in `.env`:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=panggung_lokal
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-secret-key
```

### 4. Run Database Migrations

```bash
npm run migrate
```

This will create all necessary tables:
- users
- band_profiles
- availability_posts
- media_files
- connections
- password_reset_tokens
- reports

### 5. Start the Server

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The server will start at `http://localhost:3000`

## Project Structure

```
panggung-lokal/
├── migrations/          # Database migrations
├── models/             # Database models
├── routes/             # API route handlers
├── middleware/         # Express middleware
├── utils/              # Utility functions
├── public/             # Static files (CSS, JS, images)
├── views/              # HTML templates
├── uploads/            # User uploaded files
├── app.js              # Express application setup
└── .env                # Environment variables
```

## Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start development server with auto-reload
- `npm run migrate` - Run database migrations
- `npm run migrate:down` - Rollback last migration
- `npm run migrate:create <name>` - Create new migration
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## API Endpoints

### Health Check
- `GET /health` - Server health check

### Authentication (to be implemented)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Band Profiles (to be implemented)
- `POST /api/bands/profile` - Create band profile
- `GET /api/bands/profile/:id` - Get band profile
- `PUT /api/bands/profile` - Update band profile
- `GET /api/bands/search` - Search bands
- `GET /api/bands/recent` - Get recently posted bands

### Availability (to be implemented)
- `POST /api/availability` - Create availability post
- `DELETE /api/availability/:id` - Delete availability post

### Connections (to be implemented)
- `POST /api/connections` - Record connection
- `GET /api/connections/band/:bandProfileId` - Get band connections

### Dashboard (to be implemented)
- `GET /api/dashboard/band` - Get band dashboard data
- `GET /api/dashboard/organizer` - Get organizer dashboard data

## Database Schema

### Tables

#### users
- id (serial primary key)
- email (varchar, unique)
- password_hash (varchar)
- account_type (varchar: 'band' | 'organizer')
- created_at (timestamp)
- last_login (timestamp)
- is_active (boolean)

#### band_profiles
- id (serial primary key)
- user_id (integer, foreign key)
- band_name (varchar)
- genre (varchar)
- location_city (varchar)
- location_region (varchar)
- bio (text)
- budget_min (integer)
- budget_max (integer)
- profile_photo_url (varchar)
- cover_photo_url (varchar)
- phone (varchar)
- instagram_handle (varchar)
- facebook_url (varchar)
- youtube_url (varchar)
- profile_views (integer)
- created_at (timestamp)
- updated_at (timestamp)

#### availability_posts
- id (serial primary key)
- band_profile_id (integer, foreign key)
- start_date (date)
- end_date (date)
- notes (text)
- views (integer)
- created_at (timestamp)
- is_active (boolean)

#### media_files
- id (serial primary key)
- band_profile_id (integer, foreign key)
- file_type (varchar: 'audio' | 'video' | 'image')
- file_url (varchar)
- thumbnail_url (varchar)
- title (varchar)
- display_order (integer)
- created_at (timestamp)

#### connections
- id (serial primary key)
- organizer_user_id (integer, foreign key)
- band_profile_id (integer, foreign key)
- connection_type (varchar)
- created_at (timestamp)
- notes (text)

#### password_reset_tokens
- id (serial primary key)
- user_id (integer, foreign key)
- token (varchar, unique)
- expires_at (timestamp)
- used (boolean)
- created_at (timestamp)

#### reports
- id (serial primary key)
- reporter_user_id (integer, foreign key)
- reported_entity_type (varchar)
- reported_entity_id (integer)
- reason (text)
- status (varchar)
- admin_notes (text)
- created_at (timestamp)
- resolved_at (timestamp)

## Development

### Running Migrations

Create a new migration:

```bash
npm run migrate:create create-new-table
```

Run migrations:

```bash
npm run migrate
```

Rollback last migration:

```bash
npm run migrate:down
```

### Testing

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## License

ISC
