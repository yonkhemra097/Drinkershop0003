# Drink & Snack Shop

## Run locally

1. Install the web app dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and configure the Firebase web app values.
3. Run `npm run dev`.

## Firebase Hosting

The live site is available at [https://drinker-92b6c.web.app](https://drinker-92b6c.web.app). To publish an update, build the app and deploy the `dist` directory:

```powershell
npm run build
firebase deploy --only hosting --project drinker-92b6c
```

The project currently uses the free Spark plan with `VITE_FIREBASE_FUNCTIONS_ENABLED=false`. The storefront is hosted, but online checkout and admin tools that require Cloud Functions are unavailable.

## Firestore and Realtime Database setup

The app is configured to use Firebase services for account metadata and live operational data. Account records are stored in Firestore, and live location sharing is stored in the Realtime Database.

Bootstrap administrator email (requires Cloud Functions to be deployed):

- Email: `yonkhemra2108@gmail.com`
- Create or reset this account in Firebase Authentication. The app does not provide a built-in administrator password or PIN.

New accounts are created through the app and saved with a `createdAt` timestamp in the backend records. Gmail/Google sign-in is not used for the main app flow; it uses the configured email/password flow with the Firebase project.

## Firebase setup and deployment

Use the Firebase project selected in `.firebaserc`.

Firebase Storage is not used or required by this app. Do not initialize or deploy Firebase Storage.

1. In Firebase Console, enable Authentication providers used by the app and create a Cloud Firestore database.
2. Create a Firebase Realtime Database in the project and set `VITE_FIREBASE_DATABASE_URL` to its URL in `.env.local`. Hosting and Firebase client services can run on the Spark plan. Cloud Functions require a Firebase billing plan that supports Functions:

   ```powershell
   npm run build
   firebase deploy --only hosting,firestore:rules,database
   ```

3. Keep `VITE_FIREBASE_FUNCTIONS_ENABLED=false` on Spark. This hosting-only mode disables admin tools and online checkout, which require trusted backend functions. After upgrading to a supported billing plan and deploying Functions, set it to `true`, rebuild, and redeploy Hosting:

   ```powershell
   firebase deploy --only functions
   npm run build
   firebase deploy --only hosting
   ```

4. Set `VITE_BOOTSTRAP_ADMIN_EMAIL` in the frontend `.env.local` to match the Functions `BOOTSTRAP_ADMIN_EMAIL` parameter (defaults to `yonkhemra2108@gmail.com`). Sign in with that existing Firebase Authentication account and its password; email verification is not required for bootstrap administrator access. The first matching sign-in can claim the one-time administrator role, so protect the account password and Firebase Console access. Sign out and back in if the token does not refresh. Never put account passwords or PINs in environment files or source code.
5. In Firebase Console, enable a TTL policy on `_rateLimits.expiresAt` so temporary checkout rate-limit records expire.

Admins can browse Firebase Authentication accounts under **Admin → User Management** and assign roles by email. The **Live Locations** tab shows only signed-in users who explicitly enable sharing under Personal Settings; users can stop sharing at any time. The login screen does not offer password recovery; use Firebase Authentication account management to send a reset link.

The app reads the shared product catalog, store settings, discounts, stock requests, inventory logs, and bottleneck alerts from Firestore. Any signed-in user can read the shared operational records; only administrators and managers can create or change them. Product cost prices are stored separately in the manager-only `productCosts` collection. Orders and user profiles remain access-restricted because they contain personal data. Users must explicitly enable live location sharing; locations are stored only in Realtime Database, can be read by admins and the sharing user, and disappear from the map after one minute without a refresh. Stopping sharing or disconnecting removes the location record. Existing local records are copied to Firestore when an administrator or manager signs in and the corresponding cloud collection is empty; review legacy browser data before performing this first migration.

Checkout is processed by a Cloud Function. It validates products, prices, stock, discounts, delivery fees, and totals against Firestore before creating an order and decrementing inventory in a transaction. Card and ABA PayWay orders remain pending until payment is confirmed; choosing a payment method does not itself charge a payment.

Admin and manager access is enforced with Firebase Authentication custom claims and Firestore/Realtime Database rules. The browser's local role field is not authoritative. Only admins can list Firebase Authentication accounts or change account roles by email; those operations are performed by callable Functions. Staff accounts created in User Management receive their role claim through a callable function.

Language, theme, cart, and security PIN preferences remain local to each browser. PINs are not written to Firestore. If Firebase is not configured, checkout continues to use the app's local-only behavior and does not provide shared persistence.
"# Drinker" 
