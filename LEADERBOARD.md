# Practice Tree leaderboard setup

The Practice Tree uses Cloud Firestore for its shared top-20 leaderboard. Until Firebase is configured, the practice tree continues to work and the leaderboard displays a setup message.

Firebase web configuration is public by design. Access control belongs in `firestore.rules`, not in hidden API keys.

## 1. Create Firebase and Firestore

1. Open [Firebase Console](https://console.firebase.google.com/) and select **Create a project**.
2. After the project is ready, open **Build → Firestore Database**.
3. Select **Create database**, choose **Production mode**, and choose the region where the database should live.

## 2. Register the website

1. Open **Project settings → General**.
2. Under **Your apps**, select the Web icon (`</>`).
3. Register the app. Firebase Hosting is not needed because this site stays on GitHub Pages.
4. Copy the values from the displayed `firebaseConfig` object into `firebase-config.js`.
5. Commit and push the populated `firebase-config.js` to `main`.

The required shape is also documented in `firebase-config.example.js`.

## 3. Publish the security rules

In Firebase Console:

1. Open **Build → Firestore Database → Rules**.
2. Replace the editor contents with `firestore.rules`.
3. Select **Publish**.

Or deploy the same file with the Firebase CLI:

```sh
npx firebase-tools@latest login
npx firebase-tools@latest deploy --only firestore:rules --project YOUR_PROJECT_ID
```

The rules permit public leaderboard reads and validated score creation only. Browser clients cannot update or delete scores. Names are limited to 20 characters, reaction times must be 1–10,000 milliseconds, and tree mode must be `pro` or `sportsman`.

## 4. Verify

1. Open the GitHub Pages Practice Tree.
2. Complete a clean run and submit a name.
3. Confirm a `practiceTreeScores` document appears in Firestore.
4. Confirm the score appears in the leaderboard, sorted by reaction time.

No composite Firestore index is required for the current single-field query.
