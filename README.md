# Digital Product Miner UI

UI dashboard for the Digital Product Miner backend.

## Features

- Left panel graph of most promising product ideas
- Click any idea node/list item to load lower panel metrics
- Lower panel shows platform-level metrics:
  - platform name
  - listing volume
  - sales frequency per week
  - average price
  - estimated monthly revenue
- RAG/research search section wired to `/api/v1/search`

## Setup

1. Copy env file
   - `cp .env.example .env`
2. Install dependencies
   - `npm install`
3. Start UI
   - `npm run dev`

Default URL: `http://localhost:5173`

## API base URL

Set in `.env`:

- `VITE_API_BASE_URL=http://<backend-host>:8000`

For your EC2 backend, current value is:

- `http://3.135.194.92:8000`

## Build

- `npm run build`
- `npm run preview`
