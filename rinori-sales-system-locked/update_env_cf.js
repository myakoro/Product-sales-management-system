const fs = require('fs');
const content = `DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_URL="https://shaped-earthquake.trycloudflare.com"
NEXTAUTH_SECRET="your-secret-key-rinori-sales-system"

# Next Engine Test Environment Credentials
NEXTENGINE_CLIENT_ID=Orxim4pwzPe69v
NEXTENGINE_CLIENT_SECRET=FRyJfbtsAZmuLUwXpzqovVNO8KWQDBljMYPncr59
NEXTENGINE_REDIRECT_URI=https://shaped-earthquake.trycloudflare.com/api/auth/nextengine/callback
`;
fs.writeFileSync('.env', content, 'utf8');
console.log('.env file updated with cloudflared URL');
