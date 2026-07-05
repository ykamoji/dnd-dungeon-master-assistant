docker rm -f dnd-gm-agent
docker build --no-cache -t dnd-gm-agent:local .
docker run -d -p 8000:8080 --env-file .env --name dnd-gm-agent dnd-gm-agent:local
