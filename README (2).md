# VitalSource 101 CRM

A single-page customer records website made of three plain files, with no database, no server and no build step.

| File | What it is |
| --- | --- |
| `index.html` | The page structure |
| `style.css` | All styling, including the light and dark themes |
| `app.js` | All behavior: records, search, forms and admin sign-in |

Keep the three files in the same folder.

## Features

- **Customer records**: search, view, add, edit and delete customers
- **Search and pagination**: filter by name, email, contact number, address or notes, 10 records per page
- **Add Customer form** with validation, and a **delete confirmation** dialog
- **Admin sign-in**: only the administrator can edit and delete
- **Extra pages**: Dashboard, Interactions, Reports, Notifications, Profile / Settings
- **Light and dark theme**, and a layout that works on phones

## Access levels

| Action | Guest | Admin |
| --- | --- | --- |
| View and search customers | Yes | Yes |
| Add a customer | Yes | Yes |
| Edit a customer | No | Yes |
| Delete a customer | No | Yes |

The admin username is `admin`. Click **Admin sign in** to sign in.

## Run it

Open `index.html` in any modern browser.

## Put it online with GitHub Pages

1. Upload `index.html`, `style.css`, `app.js` and `README.md` to a GitHub repository.
2. Go to **Settings > Pages**.
3. Choose your main branch and the root folder, then save.
4. Your site appears at `https://<your-username>.github.io/<repo-name>/`.

## Where the records are kept

There is no database. Records are saved in each visitor's own browser, and the page starts with 12 sample customers.

- Changes are not shared between visitors or devices.
- Clearing browser data removes the changes.
- **Profile / Settings > Reset sample data** brings the sample customers back (admin only).

## Security note

The admin password is checked in the browser against a SHA-256 hash stored in `app.js`. This keeps casual users out of edit and delete, but it is not real security: anyone who reads the page source can bypass it. Do not use it to protect sensitive customer data.

### Change the admin password

1. Choose a new password.
2. Compute the SHA-256 hash of `vs101|admin|<your-password>`. With Node.js:

   ```bash
   node -e "console.log(require('crypto').createHash('sha256').update('vs101|admin|YOUR_PASSWORD').digest('hex'))"
   ```

3. Replace the value of `ADMIN_HASH` near the top of `app.js` with the result.

## Tech

Plain HTML, CSS and JavaScript. The Inter font loads from Google Fonts, with system fonts as a fallback.
