# 📱 CaseTrack Mobile — Expo SDK 57 & React Native

[![Expo](https://img.shields.io/badge/Expo%20SDK-57.0.21-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86.3-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![React Navigation](https://img.shields.io/badge/React%20Navigation-v7-6B52AE?logo=reactnavigation&logoColor=white)](https://reactnavigation.org/)
[![Dark Mode](https://img.shields.io/badge/Design%20System-Dark%20%2F%20Light-F59E0B)](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme)
[![WCAG AA](https://img.shields.io/badge/Accessibility-WCAG%20AA-10B981)](https://www.w3.org/WAI/standards-guidelines/wcag/)

Aplicativo mobile multiplataforma (Android, iOS e Web) do ecossistema **CaseTrack**, construído com **Expo SDK 57**, voltado para gestão de inventário audiovisual, controle operacional de produções, conferência de equipamentos no set, laudos periciais de avarias e emissão/assinatura digital de termos de responsabilidade.

---

## ✨ Principais Funcionalidades

- **🌓 Dark Mode Engine & Acessibilidade (Sprint 9):**
  - Alternância instantânea no canto superior direito (`⚙️ Auto` ➔ `☀️ Claro` ➔ `🌙 Escuro` ➔ `⚙️ Auto`).
  - Sincronização automática com as preferências do sistema operacional (`useColorScheme`).
  - Persistência multiplataforma com `secureStorage` (`SecureStore` no nativo e `localStorage` na Web).
  - Conformidade visual estrita com contraste **WCAG AA**.
- **📦 Gestão Completa de Acervo (CRUD):**
  - Listagem com pull-to-refresh, empty states e busca em tempo real (nome, descrição e número de série).
  - Chips de status interativos com contadores reativos (`Todos`, `Disponível`, `Em Uso`, `Manutenção`).
  - Modal de zoom para fotos em alta resolução.
- **📷 Captura e Anexo de Fotos:**
  - Suporte nativo à câmera e galeria via `expo-image-picker`.
  - Validação estrita de tamanho máximo no cliente (**5MB**) antes do envio via `multipart/form-data`.
- **🎬 Gestão de Produções & Cronograma:**
  - Visualização do ciclo de vida em 4 etapas lineares (Pré-Produção, Captação, Pós, Entrega).
  - Bloqueio de avanço caso existam equipamentos não devolvidos na Captação.
  - Modais interativos para check-out, check-in e substituição atômica de equipamentos (B13).
- **📅 Sincronização com Google Agenda:**
  - Card reativo de diárias integrado com a API v3 do Google Calendar.
  - Interceptor HTTP no Axios que trata reconexão (HTTP 424) de forma amigável sem forçar logout.
- **📄 Termos e Contratos em PDF:**
  - Visualização de Termo de Responsabilidade com lista nominal de itens e S/N.
  - Formulário para coleta de assinatura e aceite digital em campo.

---

## 🏛️ Estrutura de Diretórios

```text
src/
├── components/                 # UI Kit reutilizável e modais
│   ├── Card.js                 # Cartão com fundo e bordas adaptativas
│   ├── CustomButton.js         # Botão primário e secundário com feedback de loading
│   ├── CustomInput.js          # Campo de texto com contraste adaptado
│   ├── ThemeToggle.js          # Alternador de tema compacto (header) e segmentado
│   ├── StatusBadge.js          # Badge semântico para status de itens e produções
│   ├── ContractModal.js        # Leitura e assinatura de termos em PDF
│   ├── EquipmentMovementModal.js # Check-out e check-in com seleção de avaria
│   ├── EquipmentSubstitutionModal.js # Substituição atômica de equipamentos (B13)
│   └── ErrorBoundary.js        # Captura defensiva de erros de renderização
├── contexts/                   # Context API para gerenciamento de estado global
│   ├── AuthContext.js          # Sessão do usuário, tokens JWT e RBAC (Admin/User)
│   └── ThemeContext.js         # Motor dinâmico de temas (Dark, Light, System)
├── navigation/                 # Configuração de rotas
│   └── AppNavigator.js         # React Navigation v7 com tema dinâmico e StatusBar
├── screens/                    # Telas da aplicação
│   ├── LoginScreen.js          # Autenticação com credenciais rápidas de demonstração
│   ├── HomeScreen.js           # Hub operacional e atalhos rápidos
│   ├── EquipmentListScreen.js  # Acervo, filtros com contadores e busca
│   ├── EquipmentDetailScreen.js# Detalhes, histórico e laudos de avaria
│   ├── EquipmentFormScreen.js  # Cadastro/edição de equipamento com upload de foto
│   ├── DamageFormScreen.js     # Registro pericial de danos físicos com foto
│   ├── ProductionListScreen.js # Listagem de produções ativas
│   ├── ProductionDetailScreen.js # Cronograma, inventário, agenda e contratos
│   └── ProductionFormScreen.js # Cadastro e edição de produções
├── services/                   # Clientes HTTP Axios
│   ├── api.js                  # Instância Axios centralizada com interceptors
│   ├── equipmentService.js     # Endpoints de equipamentos
│   ├── productionService.js    # Endpoints de produções e movimentações
│   ├── damageService.js        # Endpoints de avarias
│   ├── contractService.js      # Endpoints de contratos e termos PDF
│   ├── uploadService.js        # Upload multipart/form-data
│   └── googleCalendarService.js# Integração com Google Agenda
└── utils/                      # Constantes, tokens de design e helpers
    ├── theme.js                # Paletas de cores (Dark/Light), tipografia e espaçamentos
    ├── secureStorage.js        # Armazenamento seguro de tokens (SecureStore / localStorage)
    └── alert.js                # Dialogs nativos multiplataforma
```

---

## ⚡ Como Executar o Projeto Mobile

### 1. Instalar Dependências
```bash
cd mobile
npm install
```

### 2. Configurar a Conexão com o Backend
O cliente HTTP Axios está configurado em `src/services/api.js`.
- **Navegador Web ou Emulador Android no mesmo PC:** A URL padrão `http://localhost:3000` funciona nativamente.
- **Dispositivo Físico (Expo Go via Wi-Fi):** Ajuste a baseURL para o endereço IP local da sua máquina na rede (ex: `http://192.168.1.50:3000`).

### 3. Iniciar o Metro Bundler
```bash
# Iniciar com cache limpo
npx expo start -c
```

### 4. Escolher a Plataforma de Execução
No terminal do Expo, pressione:
- `w` — Para abrir no **Navegador Web**.
- `a` — Para abrir no **Emulador Android** conectado.
- `i` — Para abrir no **Simulador iOS** (somente macOS).
- Ou aponte a câmera do celular para o **QR Code** no terminal usando o aplicativo **Expo Go**.

---

## 👥 Credenciais Rápidas de Acesso (Demo)

Na tela de Login, você pode usar os atalhos de preenchimento em 1 toque:

- **👑 Administrador:** `admin@example.com` / `admin123`
- **👤 Freelancer:** `freelancer@example.com` / `user123`
