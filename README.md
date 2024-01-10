# CloudBreeze

![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white)
![Nginx](https://img.shields.io/badge/nginx-%23009639.svg?style=for-the-badge&logo=nginx&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white)
![Flask](https://img.shields.io/badge/flask-%23000.svg?style=for-the-badge&logo=flask&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)
![Bootstrap](https://img.shields.io/badge/bootstrap-%23563D7C.svg?style=for-the-badge&logo=bootstrap&logoColor=white)

A cryptographic cloud-based file storage system.

Check it out [here 🔗](http://3.104.70.53/)


CloudBreeze represents an advanced cloud storage platform fortified by cryptography, ensuring a secure environment for uploading, storing, and sharing files. This user-centric application offers an intuitive interface for effortless file management, empowering users to seamlessly upload, view, download, and share files with others.

Notable functionalities include robust user authentication and authorization mechanisms alongside comprehensive file permission settings. CloudBreeze ensures accessibility to files from any location or device, establishing itself as a dependable solution for efficient cloud-based file management.

Employing the microservices architecture, CloudBreeze is meticulously constructed and deployed on AWS, leveraging cutting-edge technologies such as:

- Backend

  - <img alt="NestJS" src="https://img.shields.io/badge/NestJS-•-orange" />
  - <img alt="Typescript" src="https://img.shields.io/badge/TS/JS-•-pink" />
  - <img alt="Flask" src="https://img.shields.io/badge/Flask-•-brown" />
  - <img alt="PASSPORT" src="https://img.shields.io/badge/Passport-•-yellow" />
  - <img alt="JWT" src="https://img.shields.io/badge/JWT-•-peach" />
  - <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-•-green" />
  - <img alt="Winston" src="https://img.shields.io/badge/Winston-•-yellow" />

- Frontend

  - <img alt="ReactJS" src="https://img.shields.io/badge/ReactJS-•-red" />
  - <img alt="Bootstrap" src="https://img.shields.io/badge/Bootstrap-•-black" />
  - <img alt="Axios" src="https://img.shields.io/badge/Axios-•-orange" />
  - <img alt="MUI" src="https://img.shields.io/badge/MUI-•-brown" />
  - <img alt="apex" src="https://img.shields.io/badge/ApexCharts-•-violet" />

- DevOps
  - <img alt="Docker" src="https://img.shields.io/badge/Docker-•-blue" />
  - <img alt="Nginx" src="https://img.shields.io/badge/Nginx-•-violet" />
  - <img alt="AWS" src="https://img.shields.io/badge/AWS-•-brown" />

<br>

## Main features

-Implementing a Microservices Architecture
-Ensuring Secure File Storage via Hybrid Cryptography
-Segmentation of files into consistent-sized fragments, termed as 'gems'
-Application of symmetric cryptographic techniques such as AES, ChaCha, AESGCM, AESCCM for individual encryption of each fragment before storage
-Encryption of keys using RSA as an additional security layer
-Storage of asymmetric keys either within the database or provisioned to the user
-Upon user's key request, irreversible deletion from the database, granting exclusive file access to the user
-Ongoing Development of File Sharing Capabilities
-User privilege assignment for file access
-Facilitating sharing without consuming additional memory
-Ensuring Global Accessibility
-Enabling Horizontal Scalability
-Integration of Load Balancing Mechanisms
-Containerization of Services
-Implementation of Authentication Measures
-Enforcement of Authorization Protocols
-Provisioning REST API for Request Handling

<br>

## Setting up the application:

- Create a network to run all instances on:

```
docker network ls                       ---> List all networks
docker network inspect <network_id>     ---> Inspect a network

docker network create bcloud-net
```

- Create volume for store

```
docker volume create store-vol --opt type=none --opt device=/path/to/store --opt o=bind
```

- To automatically update node modules to latest versions, run the following commands in root directory of project:

```
npm install -g npm-check-updates
ncu -u
```

- <local_port> : <container_port>
- To run the containers, use the following command:

```
docker-compose up -d
```

> Note: `-d flag` is used to run the container in background

- This will start two app container instances, one db instance and an Nginx container acting as a load balancer for the two NestJS app containers. The configuration maps port 3000 of the host machine to the ports 3001 and 3002 which are in turn connected to the same ports of each app instances' docker containers, so we can access the load balancer by navigating to http://<ip_address>:<port> in your web browser.

> If the NestJS applications fail to connect with the mongodb service inside the containers, try disabling your system firewall using:

```
sudo ufw disable
```

<br>

- To stop the containers, use the following command:

```
docker-compose stop

docker-compose down       ---> removes containers altogether
```

- Check all running containers/images:

```
docker ps -a

docker images
```

## Configuring nginx

- To change the protocol for load-balancing between the server instances, add one of the methods in the `upstream` block of [nginx.conf](load-balancer/nginx.conf) file.

```
...

http {
  upstream app_servers {
    least_conn              ----> Setting protocol
    server app_1:3001;
    server app_2:3002;
  }

  ...
}

```

- Options:
  - round_robin (Default)
  - least_conn
  - ip_hash
  - least_time

## Restarting mongod in case of crash

```
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chown mongodb:mongodb /tmp/mongodb-27017.sock
service mongod start
```

## Setting up the web app

```
npm install
npm run start
```
