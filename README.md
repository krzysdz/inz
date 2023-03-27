## About

Project description, installation instructions, user manual and other details can be found in the thesis in the [krzysdz/inz-doc](https://github.com/krzysdz/inz-doc#the-thesis-and-project-for-those-interested-about-the-content) repository.
<!-- TODO: Rewrite the most important parts in Markdown and paste it here or create /docs -->

## Development

The configuration for development isn't much different from the *production* configuration.

1. Adjust configuration values in [`config.js`](./config.js). You may want to change `TASKS_DOMAIN` to `localtest.me` or another hostname which resolves to `127.0.0.1`/`[::1]`.
2. Get appropriate certificates. [`scripts/CA/create_ca_and_certificates.sh`](./scripts/CA/create_ca_and_certificates.sh) may help you with that, but if you want to use it, modify the domains in [`scripts/CA/cnf/server.cnf`](./scripts/CA/cnf/server.cnf) before running the script.
3. Start the database using [`scripts/start_mongo.ps1`](./scripts/start_mongo.ps1). The script works with bash and PowerShell, instructs MongoDB to use `.db/data` as the database path, run as replica set `rs0` and listen only on 127.0.0.1.
   > **Note**
   > If the database has not been configured yet, connect to it using `mongosh` and initiate the replica set by running:
   >
   > ```js
   > rs.initiate()
   > ```

4. Start nginx using the `nginx` directory as prefix:

   ```shell
   nginx -p ./nginx/ -c ./nginx/conf/nginx.conf
   # It can be stopped later using
   nginx -p ./nginx/ -c ./nginx/conf/nginx.conf -s quit
   ```

5. Install dependencies

   ```bash
   npm install
   ```

6. Start the server. This may take some time if there are challenges in the database.

   ```bash
   node index.js
   ```
