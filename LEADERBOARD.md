# Practice Tree leaderboard setup

The Practice Tree uses the `drh-site` Firebase project and Cloud Firestore for its shared top-20 leaderboard. If Firestore or its rules are not ready, the practice tree continues to work and the leaderboard displays an unavailable message.

Firebase web configuration is public by design. Access control belongs in `firestore.rules`, not in hidden API keys.

## 1. Enable Firestore

1. Open the `drh-site` project in [Firebase Console](https://console.firebase.google.com/).
2. Open **Build → Firestore Database**.
3. Select **Create database**, choose **Production mode**, and choose the region where the database should live.

## 2. Web configuration

The `drh-site` web configuration is committed in `firebase-config.js`. Firebase web configuration is intentionally public. Firebase Hosting and Analytics are not required for this GitHub Pages integration. The required shape is also documented in `firebase-config.example.js`.

## 3. Publish the security rules

In Firebase Console:

1. Open **Build → Firestore Database → Rules**.
2. Replace the editor contents with `firestore.rules`.
3. Select **Publish**.

Or deploy the same file with the Firebase CLI:

```sh
npx firebase-tools@latest login
npx firebase-tools@latest deploy --only firestore:rules --project drh-site
```

The rules permit public leaderboard reads and validated score creation only. Browser clients cannot update or delete scores. Names are limited to 20 characters, reaction times must be 1–10,000 milliseconds, and tree mode must be `pro` or `sportsman`.

## 4. Verify

1. Open the GitHub Pages Practice Tree.
2. Complete a clean run and submit a name.
3. Confirm a `practiceTreeScores` document appears in Firestore.
4. Confirm the score appears in the leaderboard, sorted by reaction time.

No composite Firestore index is required for the current single-field query.
