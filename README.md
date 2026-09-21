# 🎬 CaseTrack — Sistema de Gestão de Equipamentos Audiovisuais

[![NestJS](https://img.shields.io/badge/Backend-NestJS%2011-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Expo](https://img.shields.io/badge/Mobile-Expo%20SDK%2057-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86.3-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![MySQL](https://img.shields.io/badge/Database-MySQL%208.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Container-Docker%20Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Jest](https://img.shields.io/badge/Tests-49%20Passed-C21325?logo=jest&logoColor=white)](https://jestjs.io/)
[![Swagger](https://img.shields.io/badge/Docs-Swagger%20OpenAPI-85EA2D?logo=swagger&logoColor=black)](http://localhost:3000/api)

O **CaseTrack** é uma solução completa desenvolvida para atender às demandas de produtoras audiovisuais, locadoras especializadas e profissionais freelancers. A plataforma centraliza o controle de inventário de equipamentos, alocação de itens em produções com ciclo de vida de 4 etapas, fluxos de check-in/check-out, inspeção pericial de avarias com imagens físicas, sincronização automática com Google Calendar e geração/assinatura digital de Termos de Responsabilidade em PDF.

---

## 🏛️ Arquitetura & Stack Tecnológica

| Camada | Tecnologia | Detalhes & Versões |
| :--- | :--- | :--- |
| **Backend API** | NestJS 11 | TypeScript 5.7, TypeORM 0.3.28, JWT + Passport, Multer, Swagger OpenAPI (`/api`) |
| **Banco de Dados** | MySQL 8.0 | Executado via Docker Compose, persistência em volume, porta 3306 |
| **Frontend Mobile** | Expo SDK 57 | React Native 0.86.3, React 19.2.3, React Navigation v7, Theme Engine Dinâmico |
| **Integrações** | Google APIs & PDFKit | Google Calendar API v3 (OAuth2 + AES-256-GCM), PDFKit para geração de termos |
| **Orquestração** | Docker Compose | Containers MySQL e API operando na rede privada `techacademy-network` |

---

## 🎯 Alinhamento com as Rubricas Acadêmicas (7º Bimestre)

O projeto cumpre integralmente os requisitos de avaliação das três frentes acadêmicas:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   ALINHAMENTO COM A RUBRICA - 7º BIMESTRE                        │
├─────────────────────────┬──────────────────────────┬─────────────────────────────┤
│ 📱 Mobile (4,0 pts)     │ 📐 Eng. Software (4,0 pt)│ 🛡️ Tech Forge (4,0 pts)     │
├─────────────────────────┼──────────────────────────┼─────────────────────────────┤
│ • Expo SDK 57           │ • Rastreabilidade RF/RNF │ • Upload Multer com regras: │
│ • CRUD integrado        │ • Diagramas UML (Casos de│   - Filtro MIME imagem      │
│   (Mobile ➔ API ➔ MySQL)│   Uso, Atividades,       │   - Limite estrito de 5MB   │
│ • Estados de loading,   │   Sequência e DER)       │   - Hash UUID anti-colisão  │
│   erro e pull-to-refresh│ • Histórico evolutivo    │ • Controle de acesso RBAC   │
│ • Dark/Light dinâmico   │   (doc/documentacao_     │   (RolesGuard Admin/Comum)  │
│   (WCAG AA acessível)   │   fase1.md)              │ • Criptografia AES-256-GCM  │
│ • Upload câmera/galeria │ • Backlog Ágil Sprints   │ • 49 testes unitários Jest  │
└─────────────────────────┴──────────────────────────┴─────────────────────────────┘
```

---

## ⚡ Guia de Inicialização Rápida

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) LTS (v20 ou superior)
- [Docker](https://www.docker.com/) e Docker Compose instalados
- Gerenciador de pacotes `npm`

### 2. Clonar o Repositório e Configurar Variáveis
```bash
git clone https://github.com/marchesido/CaseTrack7.git
cd CaseTrack7
```

Certifique-se de que o arquivo `.env` na raiz e em `api/.env` esteja preenchido:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=casetrack
JWT_SECRET=seu_jwt_secret_super_seguro
GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/productions/google/callback
```

### 3. Subir o Banco de Dados MySQL via Docker
```bash
# Inicia o container do MySQL 8 em background
docker-compose up -d mysqldb
```

### 4. Inicializar e Popular o Backend (NestJS)
```bash
cd api

# Instalar dependências
npm install

# Executar as migrations do TypeORM
npm run migration:run

# Popular o banco com dados de teste (Admin, Freelancer, Equipamentos, Produções)
npm run seed

# Iniciar o servidor em modo desenvolvimento
npm run dev
```
> 📌 **Documentação Interativa Swagger:** Acesse [http://localhost:3000/api](http://localhost:3000/api) com a API em execução.

### 5. Inicializar o Aplicativo Mobile (Expo SDK 57)
Abra outro terminal na pasta raiz:
```bash
cd mobile

# Instalar dependências
npm install

# Iniciar o servidor Metro com cache limpo
npx expo start -c

# Para abrir diretamente no navegador Web:
npx expo start --web

# Para abrir no emulador Android:
npx expo start --android
```

---

## 👥 Contas de Demonstração (Seeds)

O seeder inicial (`npm run seed`) cadastra perfis pré-configurados para testes e avaliação:

| Perfil | E-mail | Senha | Permissões no Sistema |
| :--- | :--- | :--- | :--- |
| **👑 Administrador** | `admin@example.com` | `admin123` | Acesso total: CRUD de equipamentos, criação de produções, substituição B13 e contratos |
| **👤 Freelancer / Operador** | `freelancer@example.com` | `user123` | Consulta ao acervo, movimentação de itens no set, laudos de avaria com foto |

*(Dica: A tela de Login do aplicativo mobile conta com cartões de preenchimento rápido em 1 toque).*

---

## 📂 Estrutura de Diretórios do Projeto

```text
Trabalho/
├── api/                        # Backend NestJS 11
│   ├── src/
│   │   ├── auth/               # Autenticação JWT, login e RolesGuard
│   │   ├── config/             # Configurações TypeORM e variáveis de ambiente
│   │   ├── contracts/          # Emissão de contratos PDF (PDFKit) e assinatura digital
│   │   ├── damages/            # Laudos de avarias com imagens físicas
│   │   ├── db/                 # Migrations e Seeds automatizados
│   │   ├── equipments/         # CRUD de equipamentos e controle de status
│   │   ├── productions/        # Ciclo de 4 etapas, alocação, B13 e Google Calendar API
│   │   ├── upload/             # Upload Multer seguro (5MB, MIME filter, UUID v4)
│   │   └── users/              # Gestão de usuários e perfis
│   ├── test/                   # Testes unitários e e2e (Jest)
│   └── README.md               # Documentação técnica do Backend
├── mobile/                     # Aplicativo Mobile React Native (Expo SDK 57)
│   ├── src/
│   │   ├── components/         # UI Kit reutilizável (ThemeToggle, Card, CustomButton, etc.)
│   │   ├── contexts/           # AuthContext e ThemeContext reativo
│   │   ├── navigation/         # AppNavigator com React Navigation v7
│   │   ├── screens/            # Telas (Home, EquipmentList, DamageForm, Productions, etc.)
│   │   ├── services/           # Clientes HTTP Axios (api.js, equipmentService, etc.)
│   │   └── utils/              # Tokens de design (theme.js), secureStorage e helpers
│   ├── App.js                  # Entry point com ThemeProvider
│   └── README.md               # Documentação técnica do Mobile
├── doc/                        # Documentação de Engenharia de Software e Gestão Ágil
│   ├── documentacao_fase1.md   # Contextualização e evolução do problema
│   ├── product_backlog.md      # Histórias de Usuário (US-01 a US-15) e RFs/RNFs
│   └── sprint_planning.md      # Planejamento detalhado das Sprints 1 a 9
├── diagramas_uml.md            # Diagramas UML (Casos de Uso, Atividades, Sequência e DER)
├── docker-compose.yml          # Definição dos containers MySQL e API
└── README.md                   # Este documento
```

---

## 📅 Histórico de Entregas (Sprints 1 a 9)

- **Sprint 1 (Concluída):** Base Docker, conexão MySQL e controle de acesso Admin vs. Comum via `RolesGuard`.
- **Sprint 2 (Concluída):** Upload de arquivos via Multer com validações estritas de tipo, tamanho (5MB) e hash UUID.
- **Sprint 3 (Concluída):** Setup do Expo SDK 57, React Navigation v7, UI Kit base (`CustomButton`, `CustomInput`, `Card`) e `HomeScreen`.
- **Sprint 4 (Concluída):** Integração CRUD de Equipamentos entre o Mobile e a API NestJS via Axios (listagem, cadastro, edição e exclusão).
- **Sprint 5 (Concluída):** Upload direto de fotos (câmera/galeria com validação de 5MB), busca em tempo real, chips de status com contadores reativos e registro de avarias (`DamageFormScreen`).
- **Sprint 6 (Concluída):** Módulo de Produções Audiovisuais no NestJS e Mobile. Entidades de 4 etapas, substituição B13 em campo, histórico de movimentações e criptografia AES-256-GCM.
- **Sprint 7 (Concluída):** Integração com Google Calendar API v3 via OAuth2. Sincronização de etapas e equipamentos, renovação automática de token e interceptação de HTTP 424.
- **Sprint 8 (Concluída):** Módulo de Contratos e Termos em PDF (RF05). Renderização com `pdfkit`, download via streaming, aceite digital e modal no Mobile.
- **Sprint 9 (Concluída):** Dark Mode Engine e Acessibilidade Visual (US-15). `ThemeContext` reativo, suporte aos 3 modos (Auto/Claro/Escuro) no cabeçalho superior direito e harmonização de 100% das telas com contraste WCAG AA.

---

## 🧪 Testes Automatizados

O backend conta com suíte completa de testes unitários cobrindo serviços, controladores, guards e criptografia:

```bash
cd api
npm run test
```

**Resultado:**
```text
Test Suites: 15 passed, 15 total
Tests:       49 passed, 49 total
Snapshots:   0 total
Time:        3.4 s
```

---

## 📄 Licença e Avaliação

Projeto acadêmico desenvolvido para a avaliação do 7º Bimestre da Tech Academy.
Desenvolvido por Douglas Alexandre Marchesi. Todos os direitos reservados.
