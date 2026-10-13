# Onde Tem?

Buscador brasileiro de filmes e séries que responde: **onde assistir?**

O projeto tem duas partes:

- **Frontend** Angular standalone (`src/`): home com destaque e trilhos, busca por título/gênero, página de detalhes.
- **API de catálogo** Node + TypeScript sem dependências de runtime (`server/`): normaliza dados do [TMDB](https://www.themoviedb.org/) para o contrato do frontend e usa um catálogo local de demonstração como fallback.

O contrato compartilhado está em [`shared/catalog-contract.ts`](shared/catalog-contract.ts) (`src/app/models.ts` só reexporta).

## Rodando localmente

Requer Node.js 20.12+ (ou 22+).

```bash
npm install
cp .env.example .env      # opcional: preencha TMDB_API_KEY para dados reais
npm start                 # API em :3000 + Angular em http://localhost:4200
```

`npm start` compila a API, sobe o servidor Node e o `ng serve`. O dev server faz proxy de `/api` para a API ([`proxy.conf.js`](proxy.conf.js)), então o navegador só faz chamadas relativas para a mesma origem. Argumentos extras vão para o `ng serve`, por exemplo `npm start -- --host 0.0.0.0 --port 4173`.

Sem `TMDB_API_KEY` tudo funciona com o catálogo de demonstração.

| Comando | O que faz |
| --- | --- |
| `npm start` | API + frontend juntos (desenvolvimento) |
| `npm run start:api` | Só a API (`dist/api/server/main.js`) |
| `npm run start:web` | Só o `ng serve` (precisa da API rodando para ter dados) |
| `npm run build` | Build de produção do Angular (`dist/onde-tem`) |
| `npm run build:api` | Compila a API para `dist/api` |
| `npm test` | Testes da API (`node --test`) e do Angular (Karma) |
| `npm run test:api` / `npm run test:web` | Cada suíte separadamente |

`npm run test:web` usa o launcher `ChromeHeadlessCI` (Chrome headless sem sandbox, definido em [`karma.conf.js`](karma.conf.js)). Para usar um Chromium específico, exporte `CHROME_BIN`.

## Variáveis de ambiente (API)

A API lê o ambiente do processo e, se existir, um `.env` na raiz (Node 20.12+). Variáveis já exportadas têm precedência. O `.env` está no `.gitignore`; só o [`.env.example`](.env.example) é versionado.

| Variável | Padrão | Uso |
| --- | --- | --- |
| `TMDB_API_KEY` | vazio | Chave v3 do TMDB. Sem ela, a API usa o catálogo demo. |
| `TMDB_READ_ACCESS_TOKEN` | vazio | Alternativa: token de leitura v4 (enviado como Bearer). Tem precedência sobre a chave v3. |
| `TMDB_LANGUAGE` | `pt-BR` | Idioma de títulos e sinopses |
| `TMDB_REGION` | `BR` | Região dos lançamentos ("Em breve") |
| `TMDB_TIMEOUT_MS` | `5000` | Timeout por requisição ao TMDB |
| `TMDB_API_BASE_URL` | `https://api.themoviedb.org/3` | Base alternativa (proxy, mock local) |
| `CATALOG_CACHE_TTL_SECONDS` | `600` | Cache em memória das respostas TMDB (`0` desativa) |
| `CATALOG_CACHE_MAX_ENTRIES` | `500` | Limite de entradas do cache |
| `API_HOST` / `API_PORT` | `127.0.0.1` / `3000` (`PORT` também é aceito) | Endereço da API. O proxy do `ng serve` usa a mesma porta, ou `ONDETEM_API_URL` se definido. |

As credenciais ficam **só no servidor**: o Angular não lê variáveis de ambiente, chama apenas `/api/...` e o build não contém chave nem o host da API do TMDB. Os logs da API nunca imprimem a credencial.

## API de catálogo

Todas as rotas são `GET` e respondem JSON. Os tipos estão em `shared/catalog-contract.ts`.

| Rota | Resposta |
| --- | --- |
| `/api/health` | `{ status: 'ok', source }` |
| `/api/catalog/home` | `HomeCatalogResponse`: `featured`, `trending`, `comingSoon` |
| `/api/catalog/search?q=` | `SearchResponse`: `query`, `results` (`q` com até 100 caracteres) |
| `/api/catalog/titles/:id` | `TitleResponse`: `title`; 404 se não existir |

Erros seguem `{ error: { code, message } }` com `bad_request` (400), `not_found` (404), `method_not_allowed` (405), `upstream_unavailable` (502) ou `internal_error` (500).

**IDs.** Títulos do TMDB usam `movie-<id>` ou `tv-<id>`. Títulos do catálogo demo usam slugs (`duna-parte-dois`) e continuam acessíveis mesmo com o TMDB ativo.

**Normalização TMDB → `CatalogTitle`.** Usamos `/search/multi` (pessoas são descartadas), `/trending/all/week` (destaque e "Em alta"), `/movie/upcoming` filtrado para datas futuras ("Em breve") e `/{movie|tv}/{id}?append_to_response=credits` (detalhes e elenco). Buscas que são exatamente o nome de um gênero (os chips da home, como "Animação") viram `/discover/movie` e `/discover/tv`. Gêneros saem em pt-BR. Duração vira `2h 46min` para filmes e `N temporadas` para séries. `year` é `null` e `poster`/`backdrop` ficam vazios quando o TMDB não informa, e o frontend mostra fallbacks.

**Disponibilidade de streaming.** O detalhe consulta `/{movie|tv}/{id}/watch/providers` do TMDB para a região de `TMDB_REGION`. Assinatura, aluguel e compra são normalizados em `availability`; quando existem provedores, `availabilityStatus` é `tmdb` e a UI exibe "Dados do TMDB". A lista pode estar vazia quando o TMDB não tem dados para a região. O catálogo demo continua marcado como `demo`.

**Cache.** Respostas do TMDB (home, buscas, detalhes) ficam em cache em memória por `CATALOG_CACHE_TTL_SECONDS`. Requisições simultâneas da mesma chave são deduplicadas. Se a atualização falhar e houver uma cópia expirada, ela é servida e a falha vai para o log.

## Fallback e fonte dos dados

| Situação | Home e busca | Detalhe de `movie-*`/`tv-*` |
| --- | --- | --- |
| Sem credencial TMDB | Catálogo demo | 404 |
| TMDB ok | TMDB | TMDB |
| TMDB falhou, com cache expirado | Cache expirado | Cache expirado |
| TMDB falhou, sem cache | Catálogo demo | 502 (a UI mostra erro com "Tentar novamente") |

A fonte usada aparece só para quem desenvolve:

- no log de inicialização (`catalog source: TMDB ...` ou `DEMO local catalog ...`);
- em cada linha de requisição (`GET /api/catalog/search?q=duna 200 source=tmdb 84ms`) e nos avisos de fallback (`TMDB unavailable for search (...); serving demo fallback`);
- no campo `source` das respostas e no header `X-Catalog-Source`.

A interface não anuncia a fonte. O único efeito visível é a atribuição exigida pelo TMDB no rodapé quando os dados vêm de lá.

O frontend trata carregamento (skeletons), vazio e erro com "Tentar novamente" na home, na busca e no detalhe. Se a API estiver fora do ar, as páginas continuam navegáveis.

## TMDB: atribuição e licença

- Crie uma conta e peça uma chave em <https://www.themoviedb.org/settings/api>. O uso da API está sujeito aos [Termos de Uso da API do TMDB](https://www.themoviedb.org/api-terms-of-use).
- Os termos exigem atribuição. Quando a resposta vem do TMDB, o rodapé mostra: "Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB", com link para themoviedb.org. Antes de publicar em produção, adicione também o logo oficial do TMDB seguindo as [diretrizes de marca](https://www.themoviedb.org/about/logos-attribution), menos destacado que a marca do Onde Tem?.
- A chave gratuita é para uso não comercial. Uso comercial exige licença com o TMDB.
- Imagens são servidas por `image.tmdb.org` (`w500` para pôsteres, `w1280` para fundos). Não as copie para o repositório.
- A disponibilidade vem do endpoint Watch Providers do TMDB e pode variar por região e data; ela não inclui preços nem links diretos.

## Produção

O build do Angular chama `/api` na mesma origem. Publique a API (`npm run build:api && node dist/api/server/main.js`, com `API_HOST=0.0.0.0` se necessário) atrás do mesmo domínio do frontend, por exemplo com um reverse proxy que envie `/api/*` para a API e o resto para `dist/onde-tem/browser` (com fallback de SPA para `index.html`). Para outra origem, forneça o token `CATALOG_API_URL` em `src/main.ts`.
