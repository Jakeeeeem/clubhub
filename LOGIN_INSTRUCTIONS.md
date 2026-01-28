---
description: How to Authenticate and Login
---

# Authentication & Login Workflow

This document outlines the standard procedures for logging in, signing up, and troubleshooting authentication issues in the ClubHub application.

## 1. Standard Login Flow

The standard login flow is designed for all user types (Admins, Coaches, Players/Parents).

1.  **Navigate to Home Page**
    *   Open `index.html` (e.g., `https://clubhubsports.net`).

2.  **Open Login Modal**
    *   Click the **"Login"** button in the top navigation bar.
    *   *Alternatively*: Click "I Already Have an Account" in the footer CTA section.

3.  **Enter Credentials**
    *   **Email**: Enter your registered email address.
    *   **Password**: Enter your password.
    *   *(Optional)* Check "Remember Me" to stay logged in.

4.  **Submit**
    *   Click the **"Login"** button.
    *   **Success**: You will see a "Login successful!" notification and be automatically redirected to your dashboard (Admin, Coach, or Player).
    *   **Failure**: An error message (e.g., "Invalid email or password") will appear. Check credentials and try again.

---

## 2. Default Demo Accounts

Use these pre-configured accounts for testing and demonstrations. No signup required.

| Role | Email | Password | Dashboard |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@clubhub.com` | `Super@123` | Super Admin Dashboard |
| **Club Admin** | `demo-admin@clubhub.com` | `password123` | Admin Dashboard |
| **Coach** | `demo-coach@clubhub.com` | `password123` | Coach Dashboard |
| **Player/Parent** | `demo-player@clubhub.com` | `password123` | Player Dashboard |

**Note**: If these accounts do not exist, the system is designed to auto-create them upon the first login attempt with the credentials above (in Development/Test environments).

---

## 3. New User Verification Flow (The "Sign Up" Test)

To verify the entire registration pipeline works correctly:

1.  **Open Test Tool**
    *   Navigate to: **[`test-signup-flow.html`](test-signup-flow.html)** (locally or on deployed site).

2.  **Run Signup Test**
    *   Click **"Run Signup Test"**.
    *   **What happens**: A random user (e.g., `testuser1234@example.com`) is created via the API.
    *   **Verification**:
        *   JWT Token is received and decoded.
        *   Context verify endpoint (`/auth/context`) is called immediately.
        *   Result should show **"Success ✅"**.

3.  **Run Organization Test (Optional)**
    *   After signup succeeds, click **"Run Org Creation Test"**.
    *   **What happens**: The new user creates a "Test Club".
    *   **Verification**: Result should show **"Success ✅"**.

---

## 4. Troubleshooting Login Issues

### Issue: "Login Successful" but Dashboard is Empty or Broken
**Cause**: Token mismatch (SECRET_KEY) or Context Failure.
**Fix**:
1.  Run the **Signup Test** (Section 3 above).
2.  If "Context Status" fails, the server configuration is invalid.
    *   **Backend Fix**: Ensure `JWT_SECRET` in `.env` matches the active server configuration.
    *   **Frontend Fix**: Clear browser cache/local storage (`Ctrl+Shift+R` -> Application -> Storage -> Clear Site Data).

### Issue: "403 Forbidden" or "Token Malformed"
**Cause**: Use of an old token from a previous server session/deployment.
**Fix**:
1.  Click **Logout** (if visible).
2.  Or manually run in console: `localStorage.clear()`
3.  Refresh and login again.

### Issue: "Network Error"
**Cause**: Backend API is down or unreachable.
**Fix**:
1.  Check `/api/health` endpoint (e.g., `https://clubhubsports-dev.onrender.com/api/health`).
2.  If down, restart backend service.
