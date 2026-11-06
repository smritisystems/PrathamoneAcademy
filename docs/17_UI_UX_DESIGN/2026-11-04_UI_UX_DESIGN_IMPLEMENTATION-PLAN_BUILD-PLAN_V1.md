---
title: "Prashant Academy — Board, Class & Student Roster Update Report"
module: "17_UI_UX_DESIGN"
category: "IMPLEMENTATION-PLAN"
document_type: "IMPLEMENTATION-PLAN"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-04"
updated_date: "2026-11-04"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["17-ui-ux-design", "implementation-plan"]
entities: []
api_routes: []
related_modules: []
---

# Prashant Academy — Board, Class & Student Roster Update Report

## 1. Executive Summary
The database was updated in an atomic PostgreSQL transaction with the user-specified Board and Class structure and 39-student enrollment roster.

## 2. Board and Class Mapping & Cohort Breakdown

| Board | Class | Standard Level | Batch / Division | Board Affiliation | Enrolled Students |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **ICSE** | **X** | Standard 10 (`id=10`) | `ICSE X` (`id=25`) | ICSE (`id=1`) | **8** |
| **CBSE** | **X** | Standard 10 (`id=10`) | `CBSE X` (`id=26`) | CBSE (`id=2`) | **5** |
| **ICSE** | **IX** | Standard 9 (`id=9`) | `ICSE IX` (`id=27`) | ICSE (`id=1`) | **15** |
| **ICSE** | **VIII** | Standard 8 (`id=8`) | `ICSE VIII` (`id=29`) | ICSE (`id=1`) | **5** |
| **SSC** | **IX** | Standard 9 (`id=9`) | `SSC IX` (`id=28`) | SSC (`id=3`) | **6** |
| **TOTAL** | — | — | — | — | **39** |

## 3. Student Roster Assignments

### ICSE — Standard X (8 Students)
- Rajnees (`PA-2024-000001`)
- Ayaan (`PA-2024-000002`)
- Netham (`PA-2024-000003`)
- Shreshta (`PA-2024-000004`)
- Savesh (`PA-2024-000005`)
- Ansh (`PA-2024-000006`)
- Riddhima (`PA-2024-000007`)
- Sonakshi (`PA-2024-000008`)

### CBSE — Standard X (5 Students)
- Raudrita (`PA-2024-000009`)
- Samruddhi (`PA-2024-000010`)
- Aman (`PA-2024-000011`)
- Ashwin (`PA-2024-000012`)
- Keshwa (`PA-2024-000013`)

### ICSE — Standard IX (15 Students)
- Satnam (`PA-2024-000014`)
- Samud (`PA-2024-000015`)
- Simran (`PA-2024-000016`)
- Kashish (`PA-2024-000017`)
- Vedant (`PA-2024-000018`)
- Khushi (`PA-2024-000019`)
- Mahek (`PA-2024-000020`)
- Johan (`PA-2024-000021`)
- Avner (`PA-2024-000022`)
- Apika (`PA-2024-000023`)
- Shrawya (`PA-2024-000024`)
- Afton (`PA-2024-000025`)
- Maahi (`PA-2024-000026`)
- Aadya (`PA-2024-000027`)
- Rida (`PA-2024-000028`)

### ICSE — Standard VIII (5 Students)
- Puneeta (`PA-2024-000029`)
- Aliya (`PA-2024-000030`)
- Siddhant (`PA-2024-000031`)
- Shaurya (`PA-2024-000032`)
- Chehek (`PA-2024-000033`)

### SSC — Standard IX (6 Students)
- Siddharth (`PA-2024-000034`)
- Aditya (`PA-2024-000035`)
- Shriya (`PA-2024-000036`)
- Sukhmeet (`PA-2024-000037`)
- Sushmya (`PA-2024-000038`)
- Aaradhya (`PA-2024-000039`)

## 4. Ledger & Financial Integrity Verification
- **Invoices**: 39 invoices totaling ₹2,935,000.00 (Unchanged, 100% preserved)
- **Payments**: 170 payments totaling ₹1,819,500.00 (Unchanged, 100% preserved)
- **Receipts**: 170 receipts (Unchanged, 100% preserved)
- **Rollback Safety**: Script `backend/scripts/rollback_board_class_structure.py` available for one-click restoration.
