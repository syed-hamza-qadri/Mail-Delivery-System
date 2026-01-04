const path = require('path');
const dotenv = require('dotenv');

// Load .env.local from repository root
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Run migration
require('./migrate-to-supabase');
