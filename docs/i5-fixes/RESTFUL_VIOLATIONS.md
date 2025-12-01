# RESTful URL Path Violations

This document lists all URL paths that violate RESTful conventions:
- **No verbs** - Only nouns
- **Always plural** - Resource names should be plural
- **Watch ambiguous words** - Words that can be verbs or nouns should be changed to explicit plural nouns

## Violations Found

### Task Routes (`/api/tasks`)

1. ❌ `/api/tasks/participated/count`
   - **Issue**: "participated" is a verb (past participle)
   - **Fix**: `/api/tasks/participants/count` or `/api/tasks/participations/count`

2. ❌ `/api/tasks/single/:id`
   - **Issue**: "single" is ambiguous (can be adjective or noun)
   - **Fix**: `/api/tasks/:id` (standard RESTful pattern)

3. ❌ `/api/tasks/single/:id/join`
   - **Issue**: "join" is a verb
   - **Fix**: `POST /api/tasks/:id/participants` (add participant to task)

4. ❌ `/api/tasks/single/:id/quit`
   - **Issue**: "quit" is a verb
   - **Fix**: `DELETE /api/tasks/:id/participants/:userId` or `DELETE /api/tasks/:id/participants` with userId in body

### Auth Routes (`/api/authentications`)

5. ❌ `/api/authentications/login`
   - **Issue**: "login" is ambiguous (can be verb or noun)
   - **Fix**: `POST /api/authentications/sessions` (create session)

6. ❌ `/api/authentications/logout`
   - **Issue**: "logout" is ambiguous (can be verb or noun)
   - **Fix**: `DELETE /api/authentications/sessions` (delete session)

7. ❌ `/api/authentications/statuses/new`
   - **Issue**: "new" is ambiguous (can be adjective or verb)
   - **Fix**: `POST /api/authentications/statuses` or `PATCH /api/users/:id/status`

### Coaching Board Routes (`/api/coaching-boards`)

8. ❌ `/api/coaching-boards/:bid/notifications/seen`
   - **Issue**: "seen" is a verb (past participle)
   - **Fix**: `PATCH /api/coaching-boards/:bid/notifications` with status in body

### Message Routes (`/api/messages`)

9. ❌ `/api/messages/private/unread`
   - **Issue**: "unread" is ambiguous (can be adjective or verb)
   - **Fix**: `/api/messages/private?read=false` or `/api/messages/unread` (if treating as noun)

10. ❌ `/api/messages/private/read`
    - **Issue**: "read" is a verb
    - **Fix**: `PATCH /api/messages/private` with read status in body

### Group Routes (`/api/groups`)

11. ❌ `/api/groups/:groupId/read`
    - **Issue**: "read" is a verb
    - **Fix**: `PATCH /api/groups/:groupId` with read status in body

### Call Routes (`/api/calls`)

12. ❌ `/api/calls/join-room`
    - **Issue**: "join" is a verb
    - **Fix**: `POST /api/calls/rooms` or `POST /api/calls/participants`

13. ❌ `/api/calls/leave-room`
    - **Issue**: "leave" is a verb
    - **Fix**: `DELETE /api/calls/rooms/:roomId/participants/:userId` or `DELETE /api/calls/participants/:userId`

### Speed Test Routes (`/speed-test`)

14. ❌ `/speed-test/start`
    - **Issue**: "start" is a verb
    - **Fix**: `POST /speed-test/tests` or `POST /speed-test/sessions`

15. ❌ `/speed-test/stop`
    - **Issue**: "stop" is a verb
    - **Fix**: `DELETE /speed-test/tests/:id` or `PATCH /speed-test/tests/:id` with status

16. ❌ `/speed-test/next-phase`
    - **Issue**: "next" is ambiguous (can be adjective or verb), "phase" is singular
    - **Fix**: `PATCH /speed-test/tests/:id/phases` or `PATCH /speed-test/tests/:id` with phase in body

### Emergency Profile Routes (`/api/emergency-profiles`)

17. ⚠️ `/api/emergency-profiles/:profileId/photo`
    - **Issue**: "photo" is singular (should be plural for consistency)
    - **Fix**: `/api/emergency-profiles/:profileId/photos` (even if single photo per profile)
    - **Note**: Sub-resource pattern is sometimes acceptable, but plural is preferred

18. ⚠️ `/api/emergency-profiles/photo` (POST)
    - **Issue**: "photo" is singular
    - **Fix**: `POST /api/emergency-profiles/photos` or `POST /api/emergency-profiles/:id/photos`

## Notes

- Some routes like `/api/tasks/self` use "self" which is commonly accepted in REST APIs for "current user's resources"
- Routes like `/api/messages/public` and `/api/messages/private` use adjectives which are acceptable when they clearly modify the noun
- Some violations (like "login"/"logout") are very common in REST APIs and may be acceptable depending on team standards

## Summary

**Total Violations**: 18

**By Type**:
- Verbs in URL: 11 violations
- Ambiguous words: 4 violations  
- Singular nouns: 3 violations

## Priority Recommendations

**High Priority** (Clear verb violations):
1. `/api/tasks/single/:id/join` → `POST /api/tasks/:id/participants`
2. `/api/tasks/single/:id/quit` → `DELETE /api/tasks/:id/participants/:userId`
3. `/api/calls/join-room` → `POST /api/calls/rooms` or `POST /api/calls/participants`
4. `/api/calls/leave-room` → `DELETE /api/calls/rooms/:roomId/participants/:userId`
5. `/speed-test/start` → `POST /speed-test/tests` or `POST /speed-test/sessions`
6. `/speed-test/stop` → `DELETE /speed-test/tests/:id` or `PATCH /speed-test/tests/:id`

**Medium Priority** (Ambiguous words):
1. `/api/tasks/participated/count` → `/api/tasks/participants/count`
2. `/api/messages/private/read` → `PATCH /api/messages/private`
3. `/api/groups/:groupId/read` → `PATCH /api/groups/:groupId`
4. `/api/coaching-boards/:bid/notifications/seen` → `PATCH /api/coaching-boards/:bid/notifications`

**Low Priority** (Commonly accepted patterns):
- `/api/authentications/login` and `/api/authentications/logout` (very common in REST APIs)
- `/api/tasks/single/:id` (could be simplified to `/api/tasks/:id`)

