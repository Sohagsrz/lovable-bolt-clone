# ⚡ Bolt Studio - AI Architect & App Builder

Bolt Studio is an advanced, AI-powered IDE and application builder inspired by Bolt.new and Lovable. It allows you to describe your application ideas in natural language and watch as the AI architects, plans, and implements production-ready code in real-time.

![Bolt Studio Preview](https://github.com/Sohagsrz/lovable-bolt-clone/raw/main/public/preview.png)

## 🚀 Key Features

### ✅ Ready & Implemented
- **AI Architect Core**: Describes and builds full-stack React applications from scratch.
- **Architectural Pacing**: Elite, deliberate cadence (4.5s inter-turn delay) for maximum observability and reasoning clarity.
- **Elite Kinematics**: High-fidelity UI motion powered by Framer Motion, including layout-synchronized transitions and kinetic feedback.
- **Integrated Terminal (XTerm)**: Real-time log streaming for AI-initiated commands and fully interactive user shell.
- **Recursive Workspace Maintenance**: Advanced folder management in the Live Explorer with recursive deletion and state-synchronized cleanup.
- **Interactive Execution Plan**: Bolt-style planning pane that shows step-by-step progress before implementation.
- **Credit Protection (Nonce System)**: Consolidated billing using `X-Operation-Nonce`, charging only one credit per user-initiated operation regardless of turns.
- **Live WebContainer Integration**: Runs Node.js applications directly in your browser with no local setup.
- **Auto-Fix Loop**: Automatically detects terminal errors and prompts the AI to fix them immediately.
- **Streaming AI Responses**: Real-time code generation using Server-Sent Events (SSE).
- **Project Persistence**: Saves your projects, messages, and files to a database via Prisma + PostgreSQL.

### 🚧 Coming Soon (Work in Progress)
- **Deployment logic**: Built-in integration for Vercel, Netlify, and Cloudflare Pages.
- **Authentication system**: Complete user registration and login flows (currently partial).
- **Multi-file Upload**: Allowing users to upload existing projects to start building.
- **Voice-to-Code**: Build apps using voice commands.
- **Advanced UI Agent**: Specialized mode for pixel-perfect design system adjustments.

## 🤖 Supported Models & Providers

Bolt Studio is designed to be model-agnostic. It currently connects through a unified API proxy to support:

| Provider | Models Supported |
| --- | --- |
| **OpenAI** | GPT-4o, GPT-4o-mini, GPT-4-turbo |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3 Opus |
| **Mistral** | Mistral Large, Mixtral 8x7B |
| **Local AI** | Ollama, LM Studio (via local proxy) |

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Framer Motion
- **Runtime**: @webcontainer/api (Browser-based Node.js)
- **Editor**: Monaco Editor / react-monaco-editor
- **Database**: Prisma ORM, PostgreSQL (Neon/Supabase)
- **Terminal**: XTerm.js
- **State Management**: Zustand
- **Icons**: Lucide React

## 🏁 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Sohagsrz/lovable-bolt-clone.git
   cd lovable-bolt-clone
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Create a `.env` file in the root:
   ```env
   DATABASE_URL="your-postgresql-url"
   NEXTAUTH_SECRET="your-secret"
   # AI Proxy configuration
   AI_API_ENDPOINT="http://localhost:4141/v1" 
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser.

## 🤝 Contributing

We welcome contributions from the community! Whether you are fixing bugs, adding new features, or improving documentation, your help is appreciated.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---
Built with ❤️ by [Sohag](https://github.com/Sohagsrz)
