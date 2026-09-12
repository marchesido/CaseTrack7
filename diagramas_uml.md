# Diagramas UML - Fase 1 (CaseTrack)

Abaixo estão os diagramas desenvolvidos para a Fase 1 do projeto, abrangendo Casos de Uso, Atividades, Sequência e o Modelo de Dados (DER).

## 1. Diagramas de Casos de Uso

### 1.1 Gestão de Equipamentos e Usuários (Foco Admin)
```mermaid
usecaseDiagram
    actor Admin as "Admin / Produtora"
    
    package "CaseTrack - Gestão Base" {
        usecase UC1 as "Gerenciar Usuários (CRUD)"
        usecase UC2 as "Gerenciar Equipamentos (CRUD)"
        usecase UC3 as "Visualizar Relatórios"
    }
    
    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
```

### 1.2 Reserva, Check-in/out e Avarias (Foco Operacional)
```mermaid
usecaseDiagram
    actor Free as "Freelancer"
    actor Admin as "Admin / Produtora"
    
    package "CaseTrack - Operação" {
        usecase UC4 as "Solicitar Reserva"
        usecase UC5 as "Aprovar/Rejeitar Reserva"
        usecase UC6 as "Realizar Check-out"
        usecase UC7 as "Realizar Check-in"
        usecase UC8 as "Registrar Avaria (Upload)"
    }
    
    Free --> UC4
    Free --> UC6
    Free --> UC7
    Free --> UC8
    
    Admin --> UC5
    Admin --> UC6
    Admin --> UC7
```

### 1.3 Ciclo de Produções Audiovisuais e Movimentações em Campo (Sprint 6)
```mermaid
usecaseDiagram
    actor Produtor as "Produtor / Gestor de Set"
    actor Operador as "Operador / Freelancer"
    
    package "CaseTrack - Produções e Set" {
        usecase UC9 as "Criar e Gerenciar Produção (4 Etapas)"
        usecase UC10 as "Alocar Equipamentos ao Projeto"
        usecase UC11 as "Realizar Check-out de Equipamento"
        usecase UC12 as "Realizar Check-in com Inspeção e Avaria"
        usecase UC13 as "Substituir Equipamento em Campo (B13)"
        usecase UC14 as "Concluir Etapa com Validação de Devolução"
    }
    
    Produtor --> UC9
    Produtor --> UC10
    Produtor --> UC13
    Produtor --> UC14
    Operador --> UC11
    Operador --> UC12
```

---

## 2. Diagramas de Atividades

### 2.1 Fluxo de Check-out com Registro de Avaria
```mermaid
activityDiagram
    start
    :Usuário seleciona Equipamento;
    :Sistema exibe detalhes da Reserva;
    if (Equipamento possui avaria prévia?) then (Sim)
        :Usuário inspeciona avaria;
    else (Não)
    endif
    if (Nova avaria identificada?) then (Sim)
        :Usuário tira foto da avaria;
        :Upload da imagem (Multer);
        :Sistema valida (Tamanho, Extensão);
        if (Validação OK?) then (Sim)
            :Salva caminho da imagem BD;
        else (Não)
            :Exibe erro de Validação;
            stop
        endif
    else (Não)
    endif
    :Confirma Check-out;
    :Sistema atualiza Status do Equipamento para "Em Uso";
    stop
```

### 2.2 Fluxo de Autenticação e Controle de Acesso
```mermaid
activityDiagram
    start
    :Usuário insere Credenciais (Email/Senha);
    :Sistema valida credenciais;
    if (Credenciais Corretas?) then (Sim)
        :Sistema verifica Perfil (Role);
        if (Admin?) then (Sim)
            :Redireciona para Dashboard Produtora;
        else (Freelancer)
            :Redireciona para Home Freelancer;
        endif
    else (Não)
        :Exibe mensagem de "Acesso Negado";
    endif
    stop
```

### 2.3 Fluxo de Conclusão da Captação e Auto-conclusão da Produção (Sprint 6)
```mermaid
activityDiagram
    start
    :Produtor solicita Conclusão da Etapa "Captação";
    :Sistema busca equipamentos com status "CHECKED_OUT";
    if (Existem equipamentos em posse da equipe?) then (Sim)
        :Sistema bloqueia avanço da etapa;
        :Exibe erro 400 "Devolva todos os itens para concluir a Captação";
        stop
    else (Não)
        :Sistema marca Etapa como "COMPLETED";
        :Avança status da Produção para próxima etapa;
        if (Última etapa concluída E 100% itens devolvidos?) then (Sim)
            :Atualiza status da Produção para "COMPLETED";
        else (Não)
        endif
    endif
    stop
```

---

## 3. Diagramas de Sequência

### 3.1 Fluxo de Upload de Imagem (Avaria)
```mermaid
sequenceDiagram
    participant App as Aplicativo Mobile
    participant API as Backend (API)
    participant FS as File System (Multer)
    participant DB as Banco de Dados
    
    App->>API: POST /avarias (FormData com Imagem)
    API->>API: Valida Token de Acesso
    API->>FS: Intercepta Arquivo (Multer)
    FS-->>API: Retorna Metadados (Tamanho, Extensão)
    API->>API: Valida Regras de Arquivo
    alt Arquivo Inválido
        API-->>App: 400 Bad Request (Erro de Validação)
    else Arquivo Válido
        FS->>FS: Salva Arquivo no Disco
        API->>DB: INSERT Avaria (Caminho da Imagem, Descrição)
        DB-->>API: Retorna ID da Avaria
        API-->>App: 201 Created (Upload com Sucesso)
    end
```

### 3.2 Fluxo de Solicitação e Aprovação de Reserva
```mermaid
sequenceDiagram
    participant Free as Freelancer (App)
    participant API as Backend (API)
    participant DB as Banco de Dados
    participant Admin as Admin (Web/App)
    
    Free->>API: POST /reservas (ID Equipamento, Datas)
    API->>DB: Verifica Disponibilidade
    alt Não Disponível
        DB-->>API: Conflito de Datas
        API-->>Free: 409 Conflict (Equipamento Indisponível)
    else Disponível
        API->>DB: INSERT Reserva (Status: Pendente)
        DB-->>API: Reserva Criada
        API-->>Free: 201 Created (Reserva Solicitada)
    end
    
    Note over API,Admin: Algum tempo depois...
    Admin->>API: PUT /reservas/{id}/status (Aprovado)
    API->>DB: UPDATE Reserva (Status: Aprovado)
    DB-->>API: Atualizado
    API-->>Admin: 200 OK
```

### 3.3 Fluxo de Substituição Atômica de Equipamento em Campo (B13 - Sprint 6)
```mermaid
sequenceDiagram
    participant App as App Mobile (Produtor)
    participant API as Backend (NestJS)
    participant DB as Banco MySQL (TypeORM Tx)
    
    App->>API: POST /productions/{id}/equipments/{peId}/substitute
    Note right of App: Payload: substituteEquipmentId, reason
    API->>API: Valida Permissão (RolesGuard)
    API->>DB: Inicia Transação Atômica (QueryRunner)
    API->>DB: Busca ProductionEquipment atual e valida status
    API->>DB: UPDATE ProductionEquipment (status = REPLACED, notes = reason)
    API->>DB: INSERT ProductionEquipment (equipamento substituto, status = ALLOCATED)
    API->>DB: Commit Transação
    DB-->>API: Transação Confirmada
    API-->>App: 200 OK (Item substituído com histórico preservado)
```

---

## 4. Diagrama Entidade-Relacionamento (DER)

```mermaid
erDiagram
    USUARIO {
        int id PK
        string nome
        string email
        string senha_hash
        string perfil "ADMIN ou FREELANCER"
        datetime criado_em
    }
    
    EQUIPAMENTO {
        int id PK
        string nome
        string descricao
        string numero_serie
        string status "DISPONIVEL, EM_USO, MANUTENCAO"
    }
    
    RESERVA {
        int id PK
        int usuario_id FK
        int equipamento_id FK
        date data_inicio
        date data_fim
        string status "PENDENTE, APROVADA, REJEITADA"
    }
    
    CHECK_IN_OUT {
        int id PK
        int reserva_id FK
        datetime data_hora
        string tipo "CHECKIN ou CHECKOUT"
        int registrado_por_id FK
    }
    
    AVARIA {
        int id PK
        int equipamento_id FK
        int reportado_por_id FK
        string descricao
        string imagem_url
        datetime data_registro
    }

    CONTRATO {
        int id PK
        int reserva_id FK
        string documento_url
        datetime emitido_em
    }

    PRODUCAO {
        int id PK
        string titulo
        string descricao
        string status "PLANNING, IN_PROGRESS, COMPLETED, CANCELLED"
        date data_inicio
        date data_fim
        decimal orcamento
        string cliente_nome
        int criado_por_id FK
        datetime criado_em
    }

    ETAPA_PRODUCAO {
        int id PK
        int producao_id FK
        string tipo "PRE_PRODUCTION, SHOOTING, POST_PRODUCTION, DELIVERY"
        string status "PENDING, IN_PROGRESS, COMPLETED"
        int ordem
        date data_inicio
        date data_fim
        string notas
    }

    EQUIPAMENTO_PRODUCAO {
        int id PK
        int producao_id FK
        int equipamento_id FK
        string status "ALLOCATED, CHECKED_OUT, CHECKED_IN, REPLACED, DAMAGED"
        datetime alocado_em
        datetime devolvido_em
        string notas
    }

    MOVIMENTACAO_EQUIPAMENTO {
        int id PK
        int producao_equipamento_id FK
        string tipo "CHECK_OUT ou CHECK_IN"
        string status "SUCCESS ou INSPECTION_FAILED"
        int executado_por_id FK
        datetime timestamp
        string notas
    }

    GOOGLE_TOKEN {
        int id PK
        int usuario_id FK
        string access_token_enc
        string refresh_token_enc
        string iv
        string auth_tag
        datetime expira_em
    }

    USUARIO ||--o{ RESERVA : solicita
    USUARIO ||--o{ CHECK_IN_OUT : registra
    USUARIO ||--o{ AVARIA : reporta
    USUARIO ||--o{ PRODUCAO : gerencia
    USUARIO ||--o{ GOOGLE_TOKEN : autentica
    USUARIO ||--o{ MOVIMENTACAO_EQUIPAMENTO : realiza
    EQUIPAMENTO ||--o{ RESERVA : associado_a
    EQUIPAMENTO ||--o{ AVARIA : possui
    EQUIPAMENTO ||--o{ EQUIPAMENTO_PRODUCAO : alocado_em
    RESERVA ||--|{ CHECK_IN_OUT : tem
    RESERVA ||--o| CONTRATO : gera
    PRODUCAO ||--|{ ETAPA_PRODUCAO : composta_por
    PRODUCAO ||--o{ EQUIPAMENTO_PRODUCAO : contem
    EQUIPAMENTO_PRODUCAO ||--o{ MOVIMENTACAO_EQUIPAMENTO : historico
```
