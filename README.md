# Central Gateway Service

A centralized API gateway service for VAHAN, eWay Bill, and eInvoice integrations.

## Features

- ✅ VAHAN API integration (RC & DL validation)
- ✅ eWay Bill API (both NIC and Whitebooks providers)
- ✅ eInvoice API (Whitebooks provider)
- ✅ Local vehicle and driver database lookup
- ✅ Rate limiting per API type
- ✅ Dispatcher authentication
- ✅ Comprehensive logging
- ✅ Error handling with detailed error codes
- ✅ MySQL database integration

## Technology Stack

- **Node.js** & **Express.js**
- **MySQL** with **Sequelize ORM**
- **Winston** for logging
- **Axios** for HTTP requests
- **node-forge** for encryption
- **Joi** for validation

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Run database migrations:**
```bash
npm run migrate
```

4. **Start the server:**
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Health Check
```
GET /api/health
```

### VAHAN APIs
```
GET  /api/gateway/vahan/vehicle/:vehicleNumber    - Get vehicle from local DB
GET  /api/gateway/vahan/driver/:dlNumber          - Get driver from local DB
POST /api/gateway/vahan/validate-vehicle          - Validate vehicle RC via VAHAN
POST /api/gateway/vahan/validate-dl               - Validate DL via VAHAN
POST /api/gateway/vahan/save-vehicle              - Save vehicle data to local DB
POST /api/gateway/vahan/save-driver               - Save driver data to local DB
```

### eWay Bill APIs
```
POST /api/gateway/eway/generate                   - Generate eWay Bill (NIC or Whitebooks)
POST /api/gateway/eway/cancel                     - Cancel eWay Bill
POST /api/gateway/eway/extend                     - Extend eWay Bill validity
```

### eInvoice APIs
```
POST /api/gateway/einvoice/generate               - Generate eInvoice
POST /api/gateway/einvoice/cancel                 - Cancel eInvoice
GET  /api/gateway/einvoice/irn/:irn               - Get eInvoice by IRN
GET  /api/gateway/einvoice/details                - Get eInvoice by document details
```

## Authentication

All API requests require dispatcher identity headers:
```
X-Dispatcher-ID: your_dispatcher_id
X-Mine-ID: your_mine_id
X-Org-ID: your_org_id
```

## Error Handling

The service returns consistent error responses:
```json
{
  "success": false,
  "status": 400,
  "error_message": "Detailed error message",
  "errorCodes": "ERROR_CODE",
  "errorDetails": { ... }
}
```

## Rate Limiting

- **Global:** 500 requests/minute
- **VAHAN:** 100 requests/minute
- **eWay Bill:** 200 requests/minute
- **eInvoice:** 150 requests/minute

## Logging

Logs are stored in:
- `combined-YYYY-MM-DD.log` - All logs (14 days retention)
- `error-YYYY-MM-DD.log` - Error logs only (30 days retention)

## Database Models

- `dispatchers` - Dispatcher information
- `static_vehicle_data` - Vehicle RC data
- `drivers` - Driver DL data
- `api_usage` - API usage tracking
- `vehicle_events` - VAHAN validation events
- `eway_events` - eWay Bill events
- `einvoice_events` - eInvoice events
- `permit_events` - Permit validation events

## Environment Variables

See `.env.example` for all required environment variables.

## Development

```bash
# Start development server with auto-reload
npm run dev

# Run tests (when available)
npm test
```

## Production Deployment

1. Set `NODE_ENV=production` in .env
2. Configure production database
3. Use process manager (PM2, systemd, etc.)
4. Set up reverse proxy (Nginx)
5. Enable SSL/TLS

## Support

For issues or questions, contact the development team.

## License

ISC
