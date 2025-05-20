# Coca-Cola Code Claimer

An Express application for claiming Coca-Cola coupon codes.

## Installation

1. Make sure you have Node.js installed on your machine
2. Clone this repository
3. Install dependencies:

```bash
npm install
```

## Running the Application

Start the application with:

```bash
npm start
```

The application will run on http://localhost:3000 by default.

## Usage

1. Open the application in your browser
2. Enter the packaging code from your Coca-Cola product
3. Paste the authorization bearer token (obtained from the Network tab when accessing your Coca-Cola account)
4. Click "Start Claim" to attempt to redeem the code

## Development

For development with auto-restart when files change:

```bash
npm run dev
```

## Project Structure

- `/public` - Static files (HTML, CSS, client-side JS)
- `/server.js` - Express server and API endpoints
- `/package.json` - Project dependencies and scripts
