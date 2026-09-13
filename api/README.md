# ⚙️ CaseTrack API — Backend NestJS 11

[![NestJS](https://img.shields.io/badge/NestJS-11.0.1-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3.28-FE0803?logo=typeorm&logoColor=white)](https://typeorm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Jest](https://img.shields.io/badge/Tests-49%20Passed-C21325?logo=jest&logoColor=white)](https://jestjs.io/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI%203.0-85EA2D?logo=swagger&logoColor=black)](http://localhost:3000/api)

Backend robusto e modular em **NestJS 11** para o ecossistema **CaseTrack**, responsável pelo controle de inventário de equipamentos audiovisuais, alocação em produções com ciclo de vida em 4 etapas, fluxos de check-in/check-out com laudos de avaria, contratos em PDF e sincronização com Google Calendar.

---

## 🏛️ Módulos & Arquitetura da Solução

```text
src/
├── auth/                       # Autenticação JWT, login, bcrypt e controle RBAC (RolesGuard)
├── check-in-out/               # Entidades legadas e suporte a conferência
├── config/                     # Configurações de ambiente e DataSource TypeORM
├── contracts/                  # Geração de PDFs (PDFKit), assinatura digital e download
├── damages/                    # Registro de avarias físicas com upload de fotos periciais
├── db/                         # Migrations TypeORM e Seeds de inicialização
├── equipments/                 # CRUD de equipamentos audiovisuais e controle de status
├── productions/                # Ciclo de 4 etapas, alocação, substituição B13 e Google Calendar
│   ├── dto/                    # DTOs validados com class-validator
│   ├── entities/               # Production, ProductionStage, ProductionEquipment, etc.
│   ├── guards/                 # ProductionAccessGuard
│   ├── utils/                  # Utilitário criptográfico AES-256-GCM
│   └── google-calendar.*       # Integração com Google Calendar API v3
├── upload/                     # Multer com validação de 5MB, MIME de imagem e hash UUID
└── users/                      # Gestão de usuários, perfis (ADMIN / USER) e entidades
```

---

## 🛡️ Políticas de Segurança & Requisitos Tech Forge

1. **Uploads Seguros (`Multer`):**
   - **Tamanho Máximo:** Validação estrita limitando arquivos a **5MB** (`limits: { fileSize: 5 * 1024 * 1024 }`).
   - **Filtro MIME:** Aceite exclusivo de imagens (`image/jpeg`, `image/png`, `image/webp`).
   - **Anti-colisão:** Geração automática de identificadores **UUID v4** no nome dos arquivos físicos.
2. **Controle de Acesso Baseado em Papéis (RBAC):**
   - `@Roles(UserRole.ADMIN)` aplicado nos endpoints críticos (criação de equipamentos, aprovação de contratos, substituição de itens B13).
   - `RolesGuard` integrado ao pipeline de execução do NestJS.
3. **Criptografia Simétrica de Ponta:**
   - Tokens sensíveis de integração com o Google Calendar são criptografados no banco de dados utilizando **AES-256-GCM** com vetor de inicialização (IV) e Authentication Tag.

---

## 📋 Pré-requisitos & Configuração de Ambiente

Crie o arquivo `.env` dentro de `api/.env`:

```env
PORT=3000
NODE_ENV=development

# Banco de Dados MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=casetrack

# Autenticação JWT
JWT_SECRET=super_secret_jwt_casetrack_key_2026
JWT_EXPIRES_IN=7d

# Integração Google Calendar API v3 (OAuth2)
GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/productions/google/callback
```

---

## 🚀 Comandos de Execução

```bash
# Instalar dependências
npm install

# Executar migrations do TypeORM
npm run migration:run

# Popular banco com dados iniciais (Admin, Freelancer, Equipamentos, Produções)
npm run seed

# Iniciar servidor em desenvolvimento (hot-reload)
npm run dev

# Compilar para produção
npm run build

# Iniciar build de produção
npm run start:prod
```

---

## 📖 Documentação Interativa da API (Swagger)

Com o backend rodando, acesse a documentação Swagger OpenAPI:

👉 **[http://localhost:3000/api](http://localhost:3000/api)**

### Tags Principais Documentadas:
- **`auth`**: Login e validação de tokens JWT.
- **`equipments`**: Listagem, cadastro, edição e exclusão de equipamentos.
- **`damages`**: Registro pericial de danos com upload de imagens.
- **`Productions`**: Criação, atualização e listagem de produções.
- **`Production Stages`**: Controle sequencial das etapas (Pré-Produção, Captação, Pós, Entrega).
- **`Equipment Movements`**: Check-out, check-in, reprovação de inspeção e substituição atômica (B13).
- **`Productions Google Calendar`**: URLs de consentimento OAuth2, conexão e sincronização de eventos.
- **`Contracts & Terms`**: Emissão programática de Termo em PDF, aceite digital e download via streaming.

---

## 🧪 Testes Automatizados (Jest)

A suíte cobre amplamente serviços essenciais, controladores, guards e criptografia:

```bash
# Executar todos os testes unitários
npm run test

# Executar testes em modo watch
npm run test:watch

# Gerar relatório de cobertura de código
npm run test:cov
```

**Resultado dos testes:**
```text
PASS src/productions/utils/crypto.util.spec.ts
PASS src/equipments/entities/equipment.entity.spec.ts
PASS src/users/entities/user.entity.spec.ts
PASS src/app.controller.spec.ts
PASS src/equipments/equipments.service.spec.ts
PASS src/productions/production-stages.service.spec.ts
PASS src/productions/production-completion.service.spec.ts
PASS src/productions/equipment-movements.service.spec.ts
PASS src/auth/auth.service.spec.ts
PASS src/productions/productions.service.spec.ts
PASS src/productions/google-calendar.service.spec.ts
PASS src/damages/damages.controller.spec.ts
PASS src/auth/auth.controller.spec.ts
PASS src/equipments/equipments.controller.spec.ts
PASS src/contracts/contracts.service.spec.ts

Test Suites: 15 passed, 15 total
Tests:       49 passed, 49 total
```