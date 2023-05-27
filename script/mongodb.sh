#!/bin/bash
read -p "Enter username (default is admin): " username
username=${username:-admin}
read -p "Enter password (default is password): " password
password=${password:-password}
read -p "Enter the host to listen on (default is 127.0.0.1): " host
host=${host:-127.0.0.1}
read -p "Enter the port to listen on (default is 27017): " port
port=${port:-27017}
read -p "Enter the name of the database to create (default is katonei): " dbname
dbname=${dbname:-katonei}

apt-get install gnupg -y
curl -fsSL https://pgp.mongodb.com/server-6.0.asc | \
   gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg \
   --dearmor

echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg] http://repo.mongodb.org/apt/debian bullseye/mongodb-org/6.0 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

apt-get update
apt-get install -y mongodb-org mongodb-org-shell

systemctl start mongod
systemctl enable mongod

mongosh admin --eval "db.createUser({user: '$username', pwd: '$password', roles: ['root']})"

sed -i "/^#.*bindIp/s/^#//" /etc/mongod.conf
sed -i "s/bindIp: .*/bindIp: $host/" /etc/mongod.conf
sed -i "s/port: .*/port: $port/" /etc/mongod.conf

systemctl restart mongod

mongosh --eval "db = db.getSiblingDB('$dbname')"
mongosh $dbname --eval "db.createUser({user: '$username', pwd: '$password', roles: ['readWrite']})"

echo "MongoDB installation completed and database $dbname created!"