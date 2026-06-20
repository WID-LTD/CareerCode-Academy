import { createServer } from 'vite';

const server = await createServer({
  configFile: 'vite.config.ts',
  logLevel: 'info',
});

await server.listen();
server.printUrls();
server.bindCLIShortcuts({ print: true });
