# Coca-Cola Code Claimer

A web application for automating the process of claiming Coca-Cola codes with a subscription-based access system.

## Features

- Subscription-based access with three tiers: Basic, Premium, and Ultimate
- Device tracking to limit access to 2 devices per subscription
- Admin panel for managing subscriptions and devices
- Automated code claiming process
- Real-time progress tracking with Server-Sent Events (SSE)

## Setup Instructions

### Prerequisites

- Node.js (v14 or later)
- NPM or Yarn
- Supabase account (for database)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/coca-claim.git
   cd coca-claim
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up Supabase:
   - Create a new Supabase project
   - Run the SQL queries in `create-tables.sql` in the Supabase SQL editor
   - Copy your Supabase URL and API key

4. Create a `.env` file in the root directory with the following content:

   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   ```

5. Start the server:

   ```bash
   npm start
   ```

6. Access the application:
   - Open `http://localhost:3000` for the main page
   - Open `http://localhost:3000/admin` for the admin panel (default credentials: admin/adminpassword123)

## Admin Credentials

- Username: `admin`
- Password: `adminpassword123`

**Important:** Change these credentials in the server.js file before deploying to production.

## Usage

### For Administrators

1. Log in to the admin panel
2. Create a new subscription for a user
3. Send the generated access code URL to the user

### For Users

1. Access the unique URL provided by the administrator (e.g., http://localhost:3000/claim?code=yourcode)
2. Enter the Coca-Cola link and packaging code
3. Click "Start Claim" to begin the claiming process

## License

This project is licensed under the MIT License - see the LICENSE file for details.
