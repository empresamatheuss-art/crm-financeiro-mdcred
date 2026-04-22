# CRM Financeiro

CRM financeiro web com foco em controle comercial, comissões, metas, fluxo de caixa e acompanhamento de performance da equipe.

Projeto publicado em:

- Produção: [crm-financeiro-mdcred.vercel.app](https://crm-financeiro-mdcred.vercel.app)
- Repositório: [github.com/empresamatheuss-art/crm-financeiro-mdcred](https://github.com/empresamatheuss-art/crm-financeiro-mdcred)

## Visão geral

Este projeto foi construído como uma interface de CRM financeiro com aparência de SaaS real, em PT-BR, voltada para operação comercial e gestão financeira.

Atualmente o sistema inclui:

- login da plataforma
- dashboard geral com KPIs
- página financeira com vendas registradas
- controle de comissões
- fluxo de caixa ligado às vendas
- ranking e painel de vendedores
- metas por equipe e por vendedor
- histórico operacional
- relatórios com exportação
- cadastro manual de vendas
- cadastro manual de vendedores
- cálculo automático de comissão do vendedor
- cálculo automático do lucro do gestor por venda
- suporte preparado para Supabase

## Stack usada

- HTML
- CSS
- JavaScript vanilla
- Vercel para deploy
- Supabase opcional para autenticação e sincronização em nuvem

## Como rodar localmente

### Opção 1: abrir no navegador

Abra o arquivo `index.html` no navegador.

### Opção 2: servidor local com Node

Na pasta do projeto, rode:

```bash
node server.js
```

Depois acesse:

```text
http://127.0.0.1:4173
```

## Modo atual dos dados

Sem Supabase configurado:

- os dados ficam salvos localmente no navegador
- o site abre em qualquer computador, mas os dados não acompanham

Com Supabase configurado:

- o login passa a ser real
- os dados acompanham sua conta em qualquer dispositivo
- vendas, vendedores, metas e perfil ficam sincronizados

## Como ativar o Supabase

1. Crie um projeto no Supabase.
2. No SQL Editor, execute o arquivo [supabase/schema.sql](./supabase/schema.sql).
3. Abra o arquivo [supabase-config.js](./supabase-config.js).
4. Preencha:

```js
window.CRM_SUPABASE_CONFIG = {
  url: "https://SEU-PROJETO.supabase.co",
  anonKey: "SUA_CHAVE_PUBLICA",
};
```

5. No painel do Supabase, deixe o login por e-mail e senha habilitado.
6. Publique novamente o projeto na Vercel.

## Deploy

O projeto está preparado para deploy estático no Vercel.

Comando usado:

```bash
vercel --prod
```

## Estrutura do projeto

```text
.
├── app.js
├── index.html
├── styles.css
├── server.js
├── supabase-config.js
├── supabase/
│   └── schema.sql
└── README.md
```
