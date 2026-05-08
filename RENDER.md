# Render Deployment

## Frontend Static Site

Build command:

```bash
npm install && npm run build
```

Publish directory:

```text
build
```

Environment variables:

```text
REACT_APP_API_BASE_URL=https://<backend-service>.onrender.com/api/v1
REACT_APP_GOOGLE_CLIENT_ID=<google-client-id>.apps.googleusercontent.com
```

For Google login, add this frontend URL to Google Cloud Console as an authorized JavaScript origin.
