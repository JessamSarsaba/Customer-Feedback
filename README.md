[README.md](https://github.com/user-attachments/files/33629566/README.md)
# VitalSource 101 CRM

A single-page customer records system for VitalSource 101. It runs entirely in the browser from one file (`index.html`), with no build step and no server.

## Features

- **Customer records**: search, view, add, edit and delete customers
- **Search and pagination**: filter by name, email, contact number, address or notes, 10 records per page
- **Add Customer form**: name, email, contact number, address and notes, with validation
- **Delete confirmation**: a confirmation dialog before a record is removed
- **Admin sign-in**: editing and deleting are limited to the administrator
- **Extra pages**: Dashboard, Interactions, Reports (customers by barangay), Notifications, and Profile / Settings
- **Light and dark theme**: Auto, Light or Dark, from Profile / Settings
- **Responsive**: works on desktop and phone screens

## Access levels

| Action | Guest | Admin |
| --- | --- | --- |
| View and search customers | Yes | Yes |
| Add a customer | Yes | Yes |
| Edit a customer | No | Yes |
| Delete a customer | No | Yes |

The admin username is `admin`. Click **Admin sign in** in the sidebar or the page header to sign in.

## Run it

Open `index.html` in any modern browser. That is all.

## Deploy to GitHub Pages

1. Upload `index.html` and this `README.md` to a GitHub repository.
2. Go to **Settings > Pages**.
3. Set the source to your main branch and the root folder, then save.
4. After a minute or two the site is live at `https://<your-username>.github.io/<repo-name>/`.

## How data is stored

Records are kept in the visitor's own browser (`localStorage`). The app starts with 12 sample customers.

- Changes are not shared between visitors or devices.
- Clearing browser data removes the changes.
- **Profile / Settings > Reset demo data** restores the sample records (admin only).

To share records between everyone, the app needs a backend such as Supabase or Firebase. The data layer in `index.html` is small (`initStore`, `startLocal`) and can be swapped for one.

## Security note

The admin password is checked in the browser against a SHA-256 hash stored in `index.html`. This keeps casual users out of edit and delete, but it is not real security: anyone who reads the page source can bypass it. Do not use it to protect sensitive customer data. A real deployment needs server-side authentication.

### Change the admin password

1. Pick a new password.
2. Compute the SHA-256 hash of `vs101|admin|<your-password>`. For example, with Node.js:

   ```bash
   node -e "console.log(require('crypto').createHash('sha256').update('vs101|admin|YOUR_PASSWORD').digest('hex'))"
   ```

3. Replace the value of `ADMIN_HASH` near the top of the script in `index.html` with the result.

## Tech

Plain HTML, CSS and JavaScript. The Inter font loads from Google Fonts, and the page falls back to system fonts if it is unavailable.

## License

Add a license of your choice before publishing.
