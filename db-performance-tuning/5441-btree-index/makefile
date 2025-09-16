# make build
build:
	docker build -t pg-btree:latest .

# make run
run:
	docker run -d --name pg_btree_index \
	  -p 5441:5432 \
	  pg-btree:latest

# make drop
drop:
	docker stop pg_btree_index
	docker rm pg_btree_index