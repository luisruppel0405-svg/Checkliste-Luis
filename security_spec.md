# Security Specification for Rental Manager

## Data Invariants
1. A project must have 10 steps.
2. `createdAt` must be the current server time and immutable.
3. `createdBy` must match the authenticated user's UID and be immutable.
4. `apartmentName` must be a valid non-empty string.
5. All 10 steps must follow the predefined structure.

## The Dirty Dozen (Attack Vectors)
1. Creating a project without being logged in.
2. Creating a project with another user's UID as `createdBy`.
3. Updating the `apartmentName` to a 1MB junk string.
4. Changing the `createdAt` timestamp after the project is created.
5. Deleting a project as an unauthenticated user (though delete is allowed for auth users here).
6. Injecting a "hidden" step into the steps array.
7. Marking all steps as completed without being the owner (Wait, all employees can edit here as it's a team tool).
8. Updating `updatedAt` to a future date instead of `request.time`.
9. Forgetting a required field during creation.
10. Using an invalid email format for `ownerEmail`.
11. Bypassing size checks on tenant names.
12. Attempting to set an admin flag (if it existed) via a normal project update.

## Rule Enforcement Verification
The rules will enforce `isSignedIn()`, `isValidProject()` schema validation, and field-level immutability for critical fields.
