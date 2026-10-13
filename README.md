# Onde Tem?

Primeiro produto navegável do buscador brasileiro que responde: **onde assistir?**

## Rodando localmente

Requer Node.js 18.19+ (ou 20+ recomendado).

```bash
npm install
npm start
# abra http://localhost:4200
npm test
npm run build
```

A aplicação é Angular standalone, sem React/Vue. A home traz destaque, trilhos de títulos, gêneros e lançamentos; a busca aceita títulos e gêneros, com estados de carregamento/vazio; cada título tem uma página de detalhes e disponibilidade por serviço.

## Dados e próxima integração

O contrato tipado está em `src/app/models.ts` e o ponto de troca está em `src/app/services/catalog.service.ts`. A implementação atual é um adapter local demonstrativo: pôsteres são imagens remotas e disponibilidade **não é dado de produção**. Para integrar uma API real:

1. Configurar um endpoint de catálogo e disponibilidade (por exemplo, `environment.apiUrl`).
2. Criar uma implementação HTTP do `CatalogService` usando `HttpClient`, mantendo os tipos `CatalogTitle` e `Availability`.
3. Adicionar cache, tratamento de erros e credenciais conforme o provedor escolhido. Nunca expor chaves privadas no frontend.

Os testes cobrem a busca tipada, os modos de acesso e o estado vazio da busca. O layout responde a desktop/mobile, tem foco visível nativo, labels e suporte a `prefers-reduced-motion`.
