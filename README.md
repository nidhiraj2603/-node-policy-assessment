# Node.js Policy Assessment & System Management Backend

A production-grade Node.js and MongoDB backend built with pure JavaScript, implementing high-performance file ingestion with **Worker Threads**, **Real-Time CPU Utilization Tracking with 70% Auto-Restart**, and a **Scheduled Message Database Insertion Post-Service**.

---

## Folder Structure

```text
node-policy-assessment/
├── .env.example                     # Sample environment configuration
├── .env                             # Active environment configuration
├── package.json                     # Dependencies, scripts, and engine specifications
├── server.js                        # Cluster Primary & Worker supervisor with auto-restart
├── data/
│   ├── sample-data.csv              # Full dataset (1,198 rows) for ingestion testing
│   └── sample-data.xlsx             # Excel version of dataset for XLSX testing
├── uploads/                         # Temporary disk storage for file uploads
├── src/
│   ├── app.js                       # Express app configuration & middleware registry
│   ├── config/
│   │   ├── db.js                    # Mongoose connection with in-memory fallback
│   │   └── index.js                 # Centralized configuration loader
│   ├── models/
│   │   ├── Agent.js                 # 1) Agent collection (Agent Name)
│   │   ├── User.js                  # 2) User collection (Name, DOB, Address, Phone, Email, etc.)
│   │   ├── UserAccount.js           # 3) User's Account collection (Account Name, Type, User ref)
│   │   ├── PolicyCategory.js        # 4) Policy Category / LOB (category_name)
│   │   ├── PolicyCarrier.js         # 5) Policy Carrier (company_name)
│   │   ├── Policy.js                # 6) Policy Info (Policy #, Dates, Collection IDs refs)
│   │   ├── ScheduledMessage.js      # Task 2: Scheduled message tracker
│   │   └── Message.js               # Task 2: Destination collection for inserted messages
│   ├── controllers/
│   │   ├── policy.controller.js     # Upload, Search, and Aggregation handlers
│   │   ├── message.controller.js    # Message schedule & retrieval handlers
│   │   └── system.controller.js     # CPU status and load simulation handlers
│   ├── routes/
│   │   ├── policy.routes.js         # /api/policies
│   │   ├── message.routes.js        # /api/messages
│   │   └── system.routes.js         # /api/system
│   ├── services/
│   │   ├── policy.service.js        # Policy search & MongoDB aggregation pipeline
│   │   ├── cpuMonitor.service.js    # Real-time CPU monitor & 70% restart trigger
│   │   └── scheduler.service.js     # Cron & timer scheduler for message DB insertion
│   ├── workers/
│   │   └── fileUploadWorker.js      # Worker thread for CSV/XLSX streaming & bulk DB writes
│   ├── middlewares/
│   │   ├── upload.middleware.js     # Multer file upload configuration (.csv, .xlsx)
│   │   └── errorHandler.middleware.js # Centralized API error handler
│   └── utils/
│       ├── cpuTracker.js            # os.cpus delta calculation utility
│       ├── dateHelper.js            # Date & time parser for flexible formats
│       └── logger.js                # Formatted timestamp logger
└── tests/
    ├── worker.test.js               # Ingestion & 6-collection validation test
    ├── policy.test.js               # Search by username & user aggregation test
    ├── scheduler.test.js            # Scheduled message execution & DB insertion test
    ├── cpu.test.js                  # CPU status & 70% auto-restart handler test
    └── runAllTests.js               # Comprehensive test suite orchestrator
```

---

## Prerequisites & Installation

- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017`) or MongoDB Atlas. *(Note: If no MongoDB instance is running, an in-memory fallback will automatically launch in development/testing mode).*

### Setup Steps
```bash
# 1. Navigate to project directory
cd node-policy-assessment

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
```

---

## Running the Application

### 1. Run Automated Tests
Runs all unit and integration tests across worker threads, 6 MongoDB collections, policy search, user aggregation, scheduled messages, and CPU restart logic:
```bash
npm test
```

### 2. Start the Server (Cluster Mode - Recommended)
Runs with Master/Worker supervisor for zero-downtime restarts on 70% CPU usage:
```bash
npm start
```

### 3. Start in Standalone Mode
Runs single-process with child process re-spawning on 70% CPU usage:
```bash
npm run start:standalone
```

### 4. Development Mode (with Nodemon)
```bash
npm run dev
```

---

## API Documentation & Examples

### Task 1: Insurance Policy Management

#### 1. Upload CSV / XLSX via Worker Threads
- **Endpoint**: `POST /api/policies/upload`
- **Content-Type**: `multipart/form-data`
- **Field**: `file` (Supports `.csv`, `.xlsx`, `.xls`)
- **Description**: Spawns a dedicated Node.js `worker_thread` (`src/workers/fileUploadWorker.js`) to parse rows and perform bulk upserts across **6 distinct MongoDB collections**:
  1. `Agent`
  2. `User`
  3. `UserAccount`
  4. `PolicyCategory` (LOB)
  5. `PolicyCarrier`
  6. `Policy`

**cURL Example**:
```bash
# Upload sample CSV
curl -X POST -F "file=@data/sample-data.csv" http://localhost:3000/api/policies/upload

# Upload sample XLSX
curl -X POST -F "file=@data/sample-data.xlsx" http://localhost:3000/api/policies/upload
```

**Response**:
```json
{
  "success": true,
  "message": "File processed and data uploaded into MongoDB successfully via Worker Thread",
  "data": {
    "totalRows": 1198,
    "processedCount": 1198,
    "upsertedPolicies": 1198,
    "agentsCount": 3,
    "categoriesCount": 19,
    "carriersCount": 46,
    "usersCount": 1149,
    "accountsCount": 1198,
    "durationMs": 622
  }
}
```

---

#### 2. Search Policy Info by Username
- **Endpoint**: `GET /api/policies/search?username=<name>`
- **Description**: Finds policy records by user's first name / username (case-insensitive) with full population of User, LOB (category), Carrier, Account, and Agent.

**cURL Example**:
```bash
curl "http://localhost:3000/api/policies/search?username=Lura"
```

**Response**:
```json
{
  "success": true,
  "message": "Found 1 policies matching username 'Lura'",
  "data": {
    "matchedUsersCount": 1,
    "policiesCount": 1,
    "policies": [
      {
        "_id": "6aa2afee...",
        "policyNumber": "YEEX9MOIBU7X",
        "policyStartDate": "2018-11-02T00:00:00.000Z",
        "policyEndDate": "2019-11-02T00:00:00.000Z",
        "premiumAmount": 1180.83,
        "policyType": "Single",
        "policyCategory": {
          "_id": "6aa2afee...",
          "categoryName": "Commercial Auto"
        },
        "carrier": {
          "_id": "6aa2afee...",
          "companyName": "Integon Gen Ins Corp"
        },
        "user": {
          "_id": "6aa2afee...",
          "firstName": "Lura Lucca",
          "email": "madler@yahoo.ca",
          "phoneNumber": "8677356559",
          "city": "MOCKSVILLE",
          "state": "NC",
          "zipCode": "27028",
          "userType": "Active Client"
        },
        "account": {
          "_id": "6aa2afee...",
          "accountName": "Lura Lucca & Owen Dodson",
          "accountType": "Commercial"
        },
        "agent": {
          "_id": "6aa2afee...",
          "agentName": "Alex Watson"
        }
      }
    ]
  }
}
```

---

#### 3. Aggregated Policy by Each User
- **Endpoint**: `GET /api/policies/aggregated`
- **Description**: MongoDB aggregation pipeline grouping policies by user, providing total policy counts, total premium amounts, and policy breakdowns per user.

**cURL Example**:
```bash
curl "http://localhost:3000/api/policies/aggregated"
```

**Response**:
```json
{
  "success": true,
  "message": "Policies aggregated by user retrieved successfully",
  "data": {
    "totalUsersWithPolicies": 1149,
    "aggregatedData": [
      {
        "userId": "6aa2afee...",
        "userName": "Cynthia Peters",
        "userEmail": "eidac@hotmail.com",
        "userPhone": "5044533604",
        "userType": "Active Client",
        "city": "Pfafftown",
        "state": "NC",
        "totalPolicies": 3,
        "totalPremium": 11111.07,
        "policies": [ ... ]
      }
    ]
  }
}
```

---

### Task 2: System Monitoring & Scheduled Services

#### 1. Track Real-Time CPU Utilization & Auto-Restart on 70% Usage
- **Endpoint**: `GET /api/system/cpu`
- **Description**: Returns live CPU utilization percentage across all cores, memory metrics, and server uptime.
- **Auto-Restart Behavior**: The `CpuMonitorService` samples CPU utilization every 1,500ms. If CPU usage reaches **70% or higher**, it logs an alert and triggers a graceful restart (in cluster mode, primary terminates the overloaded worker and forks a clean worker immediately).

**Check CPU Status**:
```bash
curl "http://localhost:3000/api/system/cpu"
```

**Simulate High CPU Load to Test 70% Restart**:
```bash
# Simulates CPU-intensive loop for 3,000ms to trigger >= 70% CPU usage
curl -X POST "http://localhost:3000/api/system/simulate-cpu-load"
```

---

#### 2. Post-Service: Schedule Message Insertion at Given Day and Time
- **Endpoint**: `POST /api/messages/schedule`
- **Body Parameters**:
  - `message` (string, required)
  - `day` (string, required): e.g. `'2026-09-15'`, `'today'`, `'tomorrow'`, or `'Monday'`
  - `time` (string, required): e.g. `'14:30'`, `'14:30:00'`, `'2:30 PM'`
- **Description**: Stores the message in the database with status `pending`. At the exact scheduled day and time, it inserts that message into the destination database collection (`messages`) and updates its status to `inserted`. Recovers automatically across server restarts.

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/messages/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Policy renewal reminder notification",
    "day": "2026-09-10",
    "time": "19:30"
  }'
```

**View Inserted Messages**:
```bash
curl "http://localhost:3000/api/messages/inserted"
```

**View Scheduled Records**:
```bash
curl "http://localhost:3000/api/messages/scheduled"
```

---

## Postman Collection Import

A complete, pre-configured Postman collection is included in the root directory:
- **Collection File**: [`postman_collection.json`](./postman_collection.json)
- **Environment File (Optional)**: [`postman_environment.json`](./postman_environment.json)

### How to Import into Postman:
1. Open **Postman**.
2. Click the **Import** button (top-left corner).
3. Drag & drop or select `postman_collection.json` (and optionally `postman_environment.json`).
4. All **11 endpoints** categorized into folders will appear immediately:
   - **System Info & Health**: Root health & discovery check
   - **Task 1 - Policy Management**: Upload CSV/XLSX (Worker Threads), Search by Username, and User Policy Aggregation
   - **Task 2 - CPU Monitoring & Server Restart**: Real-time CPU status, Load simulation, and Manual restart
   - **Task 2 - Scheduled Message Service**: Schedule message at day/time, View scheduled records, View inserted messages
5. The `{{baseUrl}}` variable is already set to `http://localhost:3000` by default.

---

## Verification & Testing Summary

All features have been tested and verified:
- **Task 1.1**: Worker thread parses CSV and XLSX, ingests 1,198 rows in ~600ms.
- **Task 1.2**: Username search returns populated policies with Agent, User, Account, Carrier, and LOB details.
- **Task 1.3**: Aggregation pipeline aggregates policies by user with count and total premium.
- **Task 1.4**: 6 distinct collections (`Agent`, `User`, `UserAccount`, `PolicyCategory`, `PolicyCarrier`, `Policy`) validated with correct relational ObjectIds.
- **Task 2.1**: CPU tracker samples usage; >=70% usage triggers cluster worker recycling / process restart.
- **Task 2.2**: Post-service takes `message`, `day`, `time` and inserts into DB when target timestamp arrives.
