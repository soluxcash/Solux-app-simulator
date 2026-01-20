# Solux - The New Standard of Credit

A modern Web3 fintech dashboard for identity verification and virtual card provisioning.

## Features

- **Passwordless Authentication** - Email-based login with 6-digit verification codes
- **Complete KYC Onboarding** - Name, DOB, address, SSN, and document upload
- **Instant Virtual Card Provisioning** - Real card numbers via Lithic API
- **Real-time Balance Tracking** - Live credit balance and spending limits
- **Transaction History** - View all card transactions
- **Secure API Proxy** - Backend handles all sensitive API calls

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Express.js, Node.js
- **APIs**: Lithic (card provisioning), Resend (email)
- **Authentication**: Email verification codes (10-min expiry)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Lithic API key (sandbox)
- Resend API key with verified domain

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/solux.git
cd solux

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Add your API keys to .env
```

### Environment Variables

```env
LITHIC_API_KEY=your_lithic_sandbox_api_key
```

For Resend, configure via your hosting platform's integration or add:
```env
RESEND_API_KEY=your_resend_api_key
```

### Development

```bash
npm run dev
```

This starts:
- Backend server on `http://localhost:3001`
- Frontend dev server on `http://localhost:5000`

### Production Build

```bash
npm run build
NODE_ENV=production node server/index.js
```

## Project Structure

```
solux/
├── components/          # React components
│   ├── CreditCard.tsx   # Card display with PAN, CVV, expiry
│   ├── Sidebar.tsx      # Navigation sidebar
│   ├── StatsGrid.tsx    # Dashboard statistics
│   └── ...
├── services/            # Service layer
│   ├── lithicService.ts # Lithic API client
│   └── collateralService.ts
├── server/              # Express backend
│   └── index.js         # API proxy & auth endpoints
├── public/              # Static assets
├── App.tsx              # Main application
├── index.tsx            # React entry point
└── index.html           # HTML template
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/send-code` | Send verification code to email |
| POST | `/api/auth/verify-code` | Verify code and authenticate |
| POST | `/api/lithic/accounts` | Create Lithic account |
| POST | `/api/lithic/cards` | Provision virtual card |
| POST | `/api/lithic/simulate/authorize` | Simulate card authorization |

## Card Provisioning Flow

1. User enters email → receives 6-digit code
2. User verifies code → accesses dashboard
3. User completes KYC form (name, DOB, address, SSN)
4. System creates Lithic account (KYC_EXEMPT)
5. Virtual card provisioned with $10,000 monthly limit
6. User sees real card details (PAN, CVV, expiry)

## Security

- All API keys stored server-side
- Verification codes expire in 10 minutes
- CORS configured for frontend origin only
- No sensitive data exposed to client

## Disclaimer

⚠️ **This application is currently running in sandbox/simulation mode using Lithic's test environment. No real money is involved. All card numbers and transactions are simulated.**

## License

MIT
