docker rm -f dnd-gm-client
docker build --no-cache -t dnd-gm-client:local .
docker run -d -e PORT=3000 -p 3000:3000 --env-file .env.local --name dnd-gm-client dnd-gm-client:local
