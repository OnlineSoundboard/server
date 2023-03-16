# Online Soundboard Server

## Development
```sh
pnpm install

pnpm run dev #dev

pnpm run build:prod #prod
```

### Env variables
- PORT - port number (default: `3000`)
- ALLOWED_ORIGINS - list of allowed origins separated by a comma (ex: `ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080`)
- DEBUG - debug level (ex: `online-soundboard:*`)
