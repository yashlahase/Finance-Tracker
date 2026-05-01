# Personal Finance Tracker - Backend API

A production-ready backend for a Personal Finance Tracker built with Node.js, Express, PostgreSQL, and Prisma ORM.

## Project Structure

```text
/Personal-Finance-Tracker
├── prisma/
│   └── schema.prisma        # Database schema (User, Category, Transaction)
├── src/
│   ├── config/
│   │   └── db.js            # Prisma Client configuration
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── categoryController.js
│   │   ├── transactionController.js
│   │   └── dashboardController.js
│   ├── middleware/
│   │   ├── auth.js          # JWT Authentication middleware
│   │   └── error.js         # Global error handler
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── transactionRoutes.js
│   │   └── dashboardRoutes.js
│   ├── app.js               # Express app configuration
│   └── server.js            # Server entry point
├── public/                  # Frontend assets (Bonus)
│   ├── index.html
│   ├── style.css
│   └── script.js
├── .env                     # Environment variables
├── package.json
└── README.md
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and get JWT token |

### Categories (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | Get all categories for user |
| POST | `/api/categories` | Create a new category |
| PUT | `/api/categories/:id` | Update a category |
| DELETE | `/api/categories/:id` | Delete a category (if no transactions) |

### Transactions (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | Get transactions (supports filters) |
| POST | `/api/transactions` | Create a new transaction |
| PUT | `/api/transactions/:id` | Update a transaction |
| DELETE | `/api/transactions/:id` | Delete a transaction |

### Dashboard & Reports (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Get balance, income, expense summary |
| GET | `/api/dashboard/reports/monthly` | Get monthly income vs expense data |

## Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Configure Database**:
   - Create a PostgreSQL database.
   - Update `DATABASE_URL` in `.env` with your credentials.
3. **Run Migrations**:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```
4. **Start the server**:
   ```bash
   npm run dev
   ```
5. **Access the Frontend**:
   - Open `http://localhost:5000` in your browser.

## Sample Postman Collection

Copy and save the following JSON as a file to import into Postman:

```json
{
	"info": {
		"name": "Finance Tracker API",
		"schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
	},
	"item": [
		{
			"name": "Auth",
			"item": [
				{
					"name": "Register",
					"request": {
						"method": "POST",
						"header": [],
						"body": {
							"mode": "raw",
							"raw": "{\n    \"name\": \"John Doe\",\n    \"email\": \"john@example.com\",\n    \"password\": \"password123\"\n}",
							"options": { "raw": { "language": "json" } }
						},
						"url": { "raw": "{{base_url}}/api/auth/register" }
					}
				}
			]
		}
	]
}
```
