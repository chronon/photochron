# chrononagram-web

## Remote Setup

Create a new remote repo, then:

```
git init
git remote add origin git@github.com:USER/NEW_REPO.git
git remote add upstream git@github.com:chronon/chrononagram-web.git
git merge upstream/main
git push -u origin main
```

## App Setup

```
pnpm install
```

## Updating from upstream

```
git pull upstream main && git push origin main
```
