# Contributing Guide

This guide explains how collaborators can clone the repository to their desktop, make changes, commit work, and push it back to GitHub.

## 1. Clone the repository

Go to desktop and right click.
then click on "Open terminal"
paste it:

git clone https://github.com/maruf50/StudyMate.git
cd StudyMate
```

If you already have the folder on your desktop, skip the `git clone` step and `cd` into the existing project folder instead.

## 2. Install dependencies

Run the install command from the repository root:

```powershell
npm install
```

## 2.5 Configure the backend

Copy the backend env template before starting the apps:

```powershell
copy apps\backend\.env.example apps\backend\.env
```

Update `DATABASE_URL` and any other values you need in `apps\backend\.env`.

## 3. Create a branch

Before making changes, create a branch for your work:

```powershell
git checkout -b feature/short-description
```

Use a branch name that describes what you are changing.

## 4. Make changes

Edit the files you need in VS Code or your editor of choice.

To run the full app locally while you work, use:

```powershell
npm run dev
```

That starts both `apps/backend` and `apps/frontend` together from the repository root.

## 5. Check your work

Use Git to review what changed:

```powershell
git status
git diff
```

## 6. Commit your changes

When your work is ready, stage and commit it:

```powershell
git add .
git commit -m "Describe your change clearly"
```

## 7. Push to GitHub

Push the branch to the remote repository:

```powershell
git push -u origin feature/short-description
```

## 8. Open a pull request

After pushing, open GitHub in your browser and create a pull request from your branch into `main`.

## Suggested commit message style

- `Add dashboard profile edits`
- `Fix navigation layout`
- `Update study tracker styles`

Keep commits focused on one change when possible.
