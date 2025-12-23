# Change Password Script

A CLI utility script to change an admin user's password directly in the database.

## Overview

The `change-password.ts` script allows administrators to reset a user's password from the command line. This is useful for:

- Resetting forgotten passwords when email-based reset isn't available
- Emergency password resets
- Development and testing scenarios

## Prerequisites

- Node.js installed
- `tsx` package available (included in devDependencies)
- `MONGODB_URI` environment variable set

## Usage

```bash
tsx scripts/change-password.ts <email> <new-password>
```

### Arguments

| Argument       | Description                             | Required |
| -------------- | --------------------------------------- | -------- |
| `email`        | The email address of the admin account  | Yes      |
| `new-password` | The new password to set for the account | Yes      |

### Example

```bash
# Change password for admin@loops.com
tsx scripts/change-password.ts admin@loops.com newSecurePassword123
```

## Environment Variables

| Variable      | Description               | Required |
| ------------- | ------------------------- | -------- |
| `MONGODB_URI` | MongoDB connection string | Yes      |

Make sure to set the environment variable before running the script:

```bash
# Using .env.local (if using dotenv)
MONGODB_URI=mongodb://localhost:27017/loops-backoffice tsx scripts/change-password.ts admin@loops.com newpassword

# Or export it first
export MONGODB_URI=mongodb://localhost:27017/loops-backoffice
tsx scripts/change-password.ts admin@loops.com newpassword
```

## How It Works

1. **Validates inputs** - Checks that both email and new password are provided
2. **Connects to MongoDB** - Uses the `MONGODB_URI` environment variable
3. **Finds the admin** - Looks up the admin account by email address
4. **Hashes the password** - Uses bcrypt with 12 salt rounds for secure hashing
5. **Updates the database** - Saves the new hashed password
6. **Disconnects** - Cleanly closes the database connection

## Output

### Success

```
Connecting to MongoDB...
Connected!
Password updated successfully for admin@loops.com
```

### Error: Missing arguments

```
Usage: tsx scripts/change-password.ts <email> <new-password>
Example: tsx scripts/change-password.ts admin@loops.com newpassword123
```

### Error: Admin not found

```
Connecting to MongoDB...
Connected!
Admin with email unknown@example.com not found
```

### Error: Missing MONGODB_URI

```
Please set MONGODB_URI environment variable
```

## Security Notes

- **Do not use in production logs** - Avoid logging or storing the plain-text password
- **Use strong passwords** - Choose passwords with sufficient length and complexity
- **Rotate passwords regularly** - Encourage users to change passwords periodically
- **Audit access** - Keep track of who runs this script and when

## Related Scripts

- [`seed-admin.ts`](../scripts/seed-admin.ts) - Creates the initial admin user
