// Proxy do `ng serve`: o navegador chama `/api/*` na mesma origem e o dev server repassa para a API Node.
// A chave TMDB fica só no processo da API; nada disso entra no bundle do Angular.
const port = process.env.API_PORT || process.env.PORT || '3000';
module.exports = {
  '/api': {
    target: process.env.ONDETEM_API_URL || `http://127.0.0.1:${port}`,
    secure: false,
    changeOrigin: true,
    logLevel: 'warn'
  }
};
