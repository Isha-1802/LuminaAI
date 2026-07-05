# Auth Testing Playbook - Lumina AI Interview

## Test User Bootstrap (MongoDB)
```
mongosh --eval "
use('test_database');
var userId = 'user_' + Date.now().toString(16);
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@lumina.dev',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  provider: 'google',
  hashed_password: null,
  role: 'interviewee',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Test Endpoints
- `POST /api/auth/register` — {email,password,name,role}
- `POST /api/auth/login` — {email,password} returns {token,user}
- `POST /api/auth/google/session` — {session_id} sets cookie
- `GET /api/auth/me` — returns current user (via cookie OR Authorization Bearer)
- `POST /api/auth/logout` — clears cookie
- `POST /api/resumes/upload` — multipart resume file
- `GET /api/resumes` — user's resumes
- `POST /api/interviews` — create interview
- `GET /api/interviews` — list history
- `GET /api/interviews/{id}` — detail
- `POST /api/interviews/{id}/message` — user turn (returns AI turn)
- `POST /api/interviews/{id}/finish` — generate feedback + score

## Success indicators
- /api/auth/me returns user data
- Dashboard loads without redirect
- Interview chat produces AI questions and feedback
