# Usability Testing Plan

## 1. Purpose

Usability testing is conducted to evaluate whether the web-based product authentication system is easy to understand, practical to use, and suitable for its intended users. The test focuses on two user groups:

- Manufacturer/Admin users who manage product registration, QR generation, product revocation, analytics, and ledger-related records.
- Consumer users who scan a product QR code and interpret the authenticity result.

## 2. Testing Objectives

The usability testing objectives are:

- To determine whether users can complete the main workflows without guidance.
- To evaluate whether navigation labels and page layouts are clear.
- To assess whether system feedback messages are understandable.
- To verify whether the QR scanning and verification process is practical on mobile devices.
- To identify interface issues that may affect user confidence, speed, or accuracy.

## 3. Participants

Recommended participant group:

| Group | Number of Participants | Profile |
|---|---:|---|
| Admin/Manufacturer users | 3 | Users familiar with basic web dashboards, product records, or inventory workflows |
| Consumer users | 3 | General users who may scan a QR code using a mobile phone |

If fewer participants are available, a minimum of 3 total participants can still be used for prototype evaluation. The test should record participant role, device used, task completion, time taken, errors, and comments.

## 4. Test Environment

| Item | Description |
|---|---|
| System | Web-based product authentication prototype |
| Backend | Node.js and Express |
| Database | PostgreSQL |
| Browser | Chrome, Edge, or mobile browser |
| Admin device | Laptop or desktop |
| Consumer device | Smartphone with camera access |
| Network | Localhost, same Wi-Fi, or deployed tunnel URL |

Before testing, prepare at least one admin account and ensure the server, database, and public pages are working.

## 5. Test Scenarios

### Scenario A: Admin Login

Task: Log in to the admin system.

Expected outcome: The participant reaches the product dashboard after entering valid credentials.

Success criteria:

- Participant identifies the login form.
- Participant enters username and password correctly.
- Participant understands invalid login feedback if wrong credentials are used.

### Scenario B: Register a Product and Generate QR Code

Task: Register a new product using a product name and serial number.

Expected outcome: The product is registered and a QR code is generated.

Success criteria:

- Participant can locate the registration page.
- Participant understands the required fields.
- Participant can complete registration.
- Participant can identify the generated QR code.
- Participant can download or copy the verification link.

### Scenario C: View Product List and QR Code

Task: Open the product list and view the QR code for a registered product.

Expected outcome: The participant can find the product record and view its QR code.

Success criteria:

- Participant can navigate to Product List.
- Participant can identify product name, serial number, date, and status.
- Participant can open the QR preview.

### Scenario D: Revoke a Product

Task: Revoke an active product and provide a reason.

Expected outcome: The product status changes to revoked and the reason is saved.

Success criteria:

- Participant can locate the revoke action.
- Participant understands that a reason is required.
- Participant can complete revocation.
- Participant can see the updated revoked status.

### Scenario E: View Analytics and Revocation History

Task: View scan statistics, product status information, recent scan logs, and revocation history.

Expected outcome: The participant can understand the summary cards, charts, scan logs, and revocation records.

Success criteria:

- Participant can navigate to Analytics.
- Participant understands total products, total scans, revoked items, and active products.
- Participant can navigate to Revocation History.
- Participant can search or filter revocation records.

### Scenario F: Consumer QR Verification

Task: Scan a product QR code using a smartphone and interpret the result.

Expected outcome: The participant can scan the QR code and understand whether the product is authentic, suspicious, invalid, or revoked.

Success criteria:

- Participant can start the scanner.
- Participant allows camera permission.
- Participant successfully scans the QR code.
- Participant understands the verification result and warning messages.

## 6. Usability Metrics

Use the following measurements during each session:

| Metric | Description |
|---|---|
| Task completion | Whether the participant completed the task successfully |
| Time on task | Time taken to complete the task |
| Error count | Number of mistakes, failed attempts, or wrong navigation choices |
| Assistance required | Whether the tester had to guide the participant |
| User satisfaction | Participant rating after completing the tasks |
| Comments | Participant feedback, confusion, or suggestions |

Recommended rating scale:

1 = Strongly disagree  
2 = Disagree  
3 = Neutral  
4 = Agree  
5 = Strongly agree

## 7. Observation Sheet

| Participant ID | Role | Device | Task | Completed? | Time Taken | Errors | Assistance | Notes |
|---|---|---|---|---|---:|---:|---|---|
| P01 | Admin | Laptop | Login | Yes/No |  |  | Yes/No |  |
| P01 | Admin | Laptop | Register product | Yes/No |  |  | Yes/No |  |
| P01 | Admin | Laptop | View product list | Yes/No |  |  | Yes/No |  |
| P01 | Admin | Laptop | Revoke product | Yes/No |  |  | Yes/No |  |
| P01 | Admin | Laptop | View analytics/history | Yes/No |  |  | Yes/No |  |
| P02 | Consumer | Mobile | Scan and verify QR | Yes/No |  |  | Yes/No |  |

## 8. Post-Test Questionnaire

Participants should answer the following questions after completing the tasks:

| No. | Statement | Rating 1-5 |
|---:|---|---:|
| 1 | The system interface is easy to understand. |  |
| 2 | The navigation between pages is clear. |  |
| 3 | The product registration process is simple. |  |
| 4 | The QR code generation and display are clear. |  |
| 5 | The product list presents information in an organized way. |  |
| 6 | The revocation process is easy to complete. |  |
| 7 | The analytics page provides useful information. |  |
| 8 | The QR scanning process is easy to use on a mobile device. |  |
| 9 | The verification result is easy to understand. |  |
| 10 | Overall, I am satisfied with the system. |  |

Optional open-ended questions:

- Which part of the system was easiest to use?
- Which part of the system was confusing?
- What improvement would you suggest?

## 9. Results Summary Template

| Task | Participants Attempted | Completed Successfully | Success Rate | Common Issues |
|---|---:|---:|---:|---|
| Admin login |  |  |  |  |
| Product registration |  |  |  |  |
| QR code viewing/download |  |  |  |  |
| Product revocation |  |  |  |  |
| Analytics/history viewing |  |  |  |  |
| Consumer QR verification |  |  |  |  |

## 10. Example Report Write-Up

Usability testing was conducted to evaluate the ease of use, clarity, and practicality of the developed web-based product authentication system. The testing involved two main user groups: administrator or manufacturer users who manage product records, and consumer users who verify product authenticity using QR code scanning. The test was carried out using a controlled environment consisting of the running web application, PostgreSQL database, desktop browser, and mobile device.

The participants were asked to complete several representative tasks, including logging into the administrator interface, registering a product, generating and viewing a QR code, viewing the product list, revoking a product, checking analytics and revocation history, and scanning a product QR code using a mobile phone. During the sessions, task completion, time taken, errors, required assistance, and participant comments were recorded.

The administrator workflow was generally easy to follow. Participants were able to identify the main navigation menu and move between the dashboard, product list, analytics, and revocation history pages. The product registration process was considered simple because it required only the product name and serial number. After registration, the generated QR code was displayed clearly, and participants were able to understand the download and copy-link actions.

The product list and revocation features were also found to be understandable. Participants could identify active and revoked product statuses, open the QR preview, and complete product revocation by providing a reason. The revocation history page supported review of revoked products, while the search function helped users locate records by product name, serial number, or reason.

For consumer usability, participants were able to use the mobile QR scanner and access the verification result page. The result statuses, such as authentic, suspicious, invalid, and revoked, were understandable because the interface displayed clear messages and product details. Warning messages helped users understand cases where the product should not be trusted.

Overall, the usability testing showed that the system is suitable for prototype demonstration and supports the main workflows of both administrators and consumers. Minor improvements can still be made, such as improving visual icons, adding clearer loading states, and making some error messages more specific. However, the test results indicate that the system provides acceptable usability for its intended purpose.

## 11. Suggested Improvements to Mention

Based on the current interface, the following improvement points may be included if observed during testing:

- Improve icon rendering on the verification page if symbols appear incorrectly in the browser.
- Add clearer empty states when no products, scans, or revocation records exist.
- Add confirmation feedback after copying a verification link.
- Improve mobile spacing for tables by using stacked card layouts on small screens.
- Add clearer instructions when camera permission is blocked.
- Add sorting or filtering to the product list if many products are registered.

