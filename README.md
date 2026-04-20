# CRM Financeiro

CRM financeiro web com foco em controle comercial, comissões, metas, fluxo de caixa e acompanhamento de performance da equipe.

Projeto publicado em:

- Produção: [crm-financeiro-mdcred.vercel.app](https://crm-financeiro-mdcred.vercel.app)
- Repositório: [github.com/empresamatheuss-art/crm-financeiro-mdcred](https://github.com/empresamatheuss-art/crm-financeiro-mdcred)

## Visão geral

Este projeto foi construído como uma interface de CRM financeiro com aparência de SaaS real, em PT-BR, voltada para operação comercial e gestão financeira.

Atualmente o sistema inclui:

- login visual de acesso
- dashboard geral com KPIs
- página financeira com vendas registradas
- controle de comissões
- fluxo de caixa
- ranking e painel de vendedores
- metas por equipe e por vendedor
- histórico operacional
- relatórios com exportação
- cadastro manual de vendas
- cadastro manual de vendedores
- cálculo de comissão do vendedor
- cálculo de lucro do gestor por venda

## Funcionalidades principais

### Vendas

- cadastro de nova venda por modal
- campos para vendedor, cliente, valor, banco, status, data da proposta e produto
- cálculo automático da comissão do vendedor a partir do percentual informado
- cálculo automático do lucro do gestor a partir do percentual informado

### Vendedores

- cadastro manual de vendedores
- meta mensal por vendedor
- ranking visual por resultado
- cards com progresso de meta
- painel individual por vendedor

### Gestão

- KPIs de vendas, comissões e lucro
- filtros globais por período, vendedor, banco, status e busca textual
- tabelas com ordenação e paginação
- exportação de dados

## Estrutura do projeto

```text
.
├── app.js
├── index.html
├── styles.css
├── server.js
├── .vercelignore
└── README.md
```

## Stack usada

- HTML
- CSS
- JavaScript vanilla
- Vercel para deploy

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

## Deploy

O projeto está preparado para deploy estático no Vercel.

Comandos usados:

```bash
vercel --prod
```

## Observações

- Os dados atuais são demonstrativos.
- Parte da persistência ainda está em memória da aplicação.
- Ao recarregar a página, os cadastros manuais podem voltar ao estado inicial enquanto não houver persistência em banco ou `localStorage`.

## Próximos passos recomendados

- persistência em `localStorage` ou banco de dados
- edição e exclusão de vendas
- edição de vendedores e metas
- autenticação real
- integração com WhatsApp
- regras de comissão por banco e produto
- relatórios mais avançados
