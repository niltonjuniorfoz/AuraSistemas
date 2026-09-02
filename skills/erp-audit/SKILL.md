---
name: ERP Complete Audit
description: Audits the ERP for broken routes, ghost code, and validates business rules in the sales flow.
---

# ERP Complete Audit Skill

This skill provides a structured decision tree for auditing the ERP's critical systems. Follow this checklist when requested by the user.

## 1. Corretude e Links (Routing Integrity)
**Goal:** Ensure all frontend API calls match an existing backend endpoint.
- [ ] Scan frontend (\src/pages\, \src/components\) for \etch\ and \piFetch\ calls.
- [ ] Extract the endpoint paths (e.g., \/api/sales/checkout\).
- [ ] Cross-reference these paths against \server.ts\ and \src/server/*.ts\ endpoint definitions (\pp.get\, \pp.post\, etc.).
- [ ] Report any endpoints called by the frontend that do not exist in the backend (Broken Routes).

## 2. Código Fantasma (Dead Code Elimination)
**Goal:** Identify components or functions that are orphaned or unreferenced.
- [ ] Scan the \src/pages\ and \src/components\ directories.
- [ ] For each \.tsx\ file, check if it is imported anywhere in the project (excluding itself).
- [ ] Report components that are never imported (Orphaned Components).

## 3. Caminhos Corretos (Fluxo de Venda)
**Goal:** Validate the strict business rules of the sales/checkout flow.
- [ ] Locate the checkout/sales creation endpoint (likely in \src/server/sales.ts\ or \src/server/store.ts\).
- [ ] Trace the lifecycle of a new sale:
  - **Stock Deduction:** Is \stock = stock - quantity\ strictly applied for physical products? Are there any race conditions?
  - **Financial Records:** Are taxes, commissions, or discounts properly calculated before saving to the database?
  - **Status Updates:** Are the order statuses correctly set (e.g., \pending\, \completed\)?
- [ ] Report any logical flaws or missing validations in this flow.
