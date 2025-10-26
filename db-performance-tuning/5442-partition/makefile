build:
	docker build -t pg-partition:latest .

run:
	docker run -d --name pg_partition \
	  -p 5442:5432 \
	  pg-partition:latest

drop:
	docker stop pg_partition || true
	docker rm pg_partition || true
