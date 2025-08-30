build:
	docker build -t pg-btree:latest .

run:
	docker run -d --name pg_btree_index \
	  -p 5441:5432 \
	  pg-btree:latest