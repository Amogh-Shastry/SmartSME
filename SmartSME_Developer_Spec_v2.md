# SmartSME Platform - Developer Specification

## Project Vision
SmartSME is an AI-powered, event-driven business management platform for SMEs.

### Core Innovations
1. Event-Driven ERP Architecture (RabbitMQ)
2. Workflow Engine
3. OCR + NLP Smart Business Input Engine

---

# Architecture Overview

```text
Forms / NLP / OCR
        ↓
Business Input Engine
        ↓
Structured Events
        ↓
RabbitMQ
        ↓
Workflow Engine
        ↓
Business Modules
        ↓
Analytics
        ↓
Business Intelligence
```

## Technology Direction

### Frontend
- React SPA + PWA

### Backend
- Node.js + Express

### Event Bus
- RabbitMQ

### Database
- PostgreSQL

### AI Services
- OCR Processing
- NLP Parsing
- Analytics

---

# Modules

## 1. Authentication Module
- Registration
- Login
- Logout
- Forgot Password
- Change Password
- Profile Management
- JWT Authentication
- Session Management

## 2. Business Setup Module
- Business Name
- GST Number
- PAN Number
- Address
- Contact Information
- Currency Settings
- Tax Settings
- Invoice Number Format

## 3. Party Management Module
### Customers
- Add/Edit/Delete/Search Customer
### Suppliers
- Add/Edit/Delete/Search Supplier
### Features
- Contact Details
- GST Information
- Outstanding Balance
- Transaction History
- Top Customers
- Active Suppliers

## 4. Product & Inventory Module
- Product Management
- SKU Management
- HSN/SAC
- Purchase Price
- Selling Price
- Stock Tracking
- Stock Adjustment
- Inventory Audit
- Low Stock Alerts
- Out Of Stock Alerts

## 5. Sales Module
- Create/Edit/Cancel Sales Order
- Invoice Generation
- PDF Export
- Print Invoice
- Full/Partial Payment Tracking
- Customer Purchase History

## 6. Purchase Module
- Create Purchase Order
- Cancel Purchase Order
- Purchase History
- Supplier Balances

## 7. Expense Module
- Add/Edit/Delete Expense
- Expense Categories
- Daily Reports
- Monthly Reports

## 8. Accounting Module
- Receivables
- Payables
- Cash Flow Summary
- Transaction Ledger

## 9. Reporting Module
- Sales Reports
- Purchase Reports
- Inventory Reports
- Expense Reports
- Profit Summary
- Cash Flow Summary

## 10. Dashboard Module
### KPI Cards
- Total Sales
- Total Purchases
- Total Expenses
- Inventory Value
- Pending Receivables
- Pending Payables

### Charts
- Revenue Trend
- Expense Trend
- Inventory Trend

### Alerts
- Low Stock
- Pending Payments
- Workflow Errors

## 11. Workflow Engine
- Rule Builder
- Rule Execution
- Rule History
- Workflow Monitoring

Examples:

- WHEN Sale Created → Update Inventory
- WHEN Stock < Threshold → Generate Restock Alert
- WHEN Expense > ₹10,000 → Flag Expense

## 12. Event Management Module
### Events
- SALE_CREATED
- PURCHASE_CREATED
- STOCK_UPDATED
- EXPENSE_ADDED
- PAYMENT_RECEIVED
- PAYMENT_PENDING
- ORDER_CREATED

### Features
- Event Log
- Event Replay
- Event Monitoring
- Failed Event Tracking

## 13. RabbitMQ Integration
- Publish Events
- Consume Events
- Retry Failed Messages
- Dead Letter Queue
- Queue Monitoring

## 14. Smart Business Input Engine

### Traditional Forms
- Standard ERP Forms

### NLP Input
Examples:
- Sold 10 rice bags to Kumar Traders
- Purchase 50 sugar packets from ABC Suppliers

Functions:
- Intent Detection
- Entity Extraction
- Event Generation

### OCR Input
Input Sources:
- WhatsApp Screenshots
- SMS Screenshots
- Invoice Images
- Order Slip Images

Functions:
- OCR Processing
- Text Extraction
- Entity Extraction
- Event Creation

### Validation Engine
- Customer Validation
- Supplier Validation
- Product Validation
- Quantity Validation

### Confirmation Engine
- Human Approval Before Event Publishing

### Event Generator
- Standardized Event Messages

## 15. Analytics Module
- Revenue Trends
- Growth Trends
- Expense Analysis
- Fast Moving Products
- Slow Moving Products
- Customer Analytics

## 16. Business Health Module
- Inventory Health Score
- Revenue Health Score
- Cash Flow Health Score
- Expense Health Score
- Overall Business Health Score

## 17. Notification Module
- Low Stock Alerts
- Pending Payments
- Workflow Alerts
- Queue Failure Alerts
- Event Failure Alerts

## 18. Audit & Activity Module
- Activity Logs
- Change History
- Event History

## 19. AI Advisor Module (Stretch Goal)
- Business Insights
- Recommendations
- Risk Detection

## 20. Forecasting Module (Stretch Goal)
- Inventory Forecasting
- Revenue Forecasting
- Cash Flow Forecasting


---

# Detailed Architecture

## High-Level Architecture

```text
┌─────────────────────────────────────────────┐
│                 React PWA                   │
│                                             │
│ Forms | NLP Input | OCR Upload | Dashboard  │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│              API Gateway / BFF              │
│              (Node.js + Express)            │
└─────────────────────┬───────────────────────┘
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼

 Business Input   ERP Services   Workflow Engine
     Engine

          │           │           │
          └──────┬────┴────┬──────┘
                 ▼         ▼

             RabbitMQ Event Bus

                 │
      ┌──────────┼──────────┬──────────┐
      ▼          ▼          ▼          ▼

 Inventory    Sales      Analytics  Notification
 Service      Service    Service    Service

      │          │          │          │
      └──────────┴──────────┴──────────┘
                     │
                     ▼

              PostgreSQL Database
```

## Architectural Style

### Primary Style
- Event-Driven Architecture (EDA)

### Secondary Style
- Modular Monolith

### Communication
- RabbitMQ Message Broker

### Data Storage
- PostgreSQL

The system is intentionally designed as a modular monolith to reduce deployment complexity while still benefiting from event-driven communication.

---

## Business Input Engine

### Purpose

Convert multiple input types into a standardized business event.

### Supported Inputs

1. Traditional Forms
2. Natural Language Commands
3. OCR Image Uploads

### Processing Pipeline

```text
User Input
     │
     ▼
Input Parser
     │
     ▼
OCR (Optional)
     │
     ▼
NLP Extraction
     │
     ▼
Validation Engine
     │
     ▼
Confirmation Screen
     │
     ▼
Event Generator
     │
     ▼
RabbitMQ
```

### Example

Input:

"Kumar Traders wants 50 bags of rice tomorrow."

Output:

{
  "eventType": "ORDER_CREATED",
  "party": "Kumar Traders",
  "product": "Rice",
  "quantity": 50
}

---

## Workflow Engine

### Purpose

Automate business processes using configurable rules.

### Example Rules

WHEN Sale Created
THEN Update Inventory

WHEN Stock < Threshold
THEN Generate Restock Alert

WHEN Expense > 10000
THEN Flag Expense

### Workflow Lifecycle

```text
Event Received
      │
      ▼
Rule Evaluation
      │
      ▼
Condition Match
      │
      ▼
Action Execution
      │
      ▼
Event Published
```

---

## RabbitMQ Event Bus

### Purpose

Decouple modules and allow asynchronous processing.

### Core Events

- ORDER_CREATED
- SALE_CREATED
- PURCHASE_CREATED
- STOCK_UPDATED
- EXPENSE_ADDED
- PAYMENT_RECEIVED
- PAYMENT_PENDING

### Event Flow

```text
SALE_CREATED
      │
      ▼
RabbitMQ
      │
      ├── Inventory Service
      ├── Analytics Service
      ├── Notification Service
      └── Audit Service
```

---

## Service Responsibilities

### Sales Service
- Sales Orders
- Invoices
- Payment Tracking

Publishes:
- SALE_CREATED

### Inventory Service
- Product Management
- Stock Tracking
- Inventory Adjustments

Publishes:
- STOCK_UPDATED

### Expense Service
- Expense Management
- Expense Categorization

Publishes:
- EXPENSE_ADDED

### Analytics Service
- Revenue Analytics
- Inventory Analytics
- Business Health Scoring

### Notification Service
- Alerts
- Workflow Notifications
- Queue Failure Notifications

### Audit Service
- Activity Logs
- Event Logs
- Change History

---

## Database Design Direction

### Core Entities

Business
User
Party
Product
Inventory
Sale
SaleItem
Purchase
PurchaseItem
Expense
Invoice
WorkflowRule
WorkflowExecution
EventLog
Notification

### Relationships

Business
 ├── Parties
 ├── Products
 ├── Sales
 ├── Purchases
 └── Expenses

Sale
 ├── SaleItems
 └── Party

Purchase
 ├── PurchaseItems
 └── Party

---

## AI Layer

### OCR Engine

Input:
- Invoice Images
- Chat Screenshots
- Order Slips

Output:
- Extracted Text

### NLP Engine

Input:
- Raw Text

Output:
- Structured Business Intent

### Business Intelligence

- Business Health Score
- Expense Insights
- Revenue Insights

---

## Deployment Architecture

```text
Frontend (React PWA)
         │
         ▼
Node.js Backend
         │
         ▼
RabbitMQ
         │
         ▼
PostgreSQL

Optional:

Python AI Service
         │
         ├── OCR
         ├── NLP
         └── Analytics
```

### Docker Containers

1. Frontend
2. Backend
3. RabbitMQ
4. PostgreSQL
5. AI Service (Optional)

