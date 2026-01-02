export const DEFAULT_PROJECT_FILES = [
  {
    path: 'package.json',
    type: 'file',
    content: JSON.stringify({
      name: 'bolt-app',
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'lucide-react': '^0.294.0',
        'framer-motion': '^10.16.4'
      },
      devDependencies: {
        '@types/react': '^18.2.37',
        '@types/react-dom': '^18.2.15',
        '@vitejs/plugin-react': '^4.2.0',
        vite: '^5.0.0',
        autoprefixer: '^10.4.16',
        postcss: '^8.4.31',
        tailwindcss: '^3.3.5'
      }
    }, null, 2)
  },
  {
    path: 'vite.config.ts',
    type: 'file',
    content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`
  },
  {
    path: 'index.html',
    type: 'file',
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bolt Studio App</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-[#0a0a0c] text-white">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <!-- BOLT INSPECTOR INJECTION -->
    <script src="/bolt-inspector.js"></script>
  </body>
</html>`
  },
  {
    path: 'src/main.tsx',
    type: 'file',
    content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`
  },
  {
    path: 'src/index.css',
    type: 'file',
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`
  },
  {
    path: 'src/App.tsx',
    type: 'file',
    content: `import React from 'react';
import { Sparkles, Rocket, Shield, Zap } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="relative mb-8">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-indigo-600/40 animate-bounce relative z-10">
          <Rocket className="w-10 h-10" />
        </div>
        <div className="absolute -inset-4 bg-indigo-500/20 blur-2xl rounded-full animate-pulse" />
      </div>

      <img 
        src="https://placehold.co/600x400/1e1b4b/6366f1?text=ARCHITECT+MATERIALIZED" 
        alt="Project Baseline" 
        className="w-full max-w-lg h-48 object-cover rounded-3xl mb-12 border border-white/10 shadow-2xl opacity-50 grayscale hover:grayscale-0 transition-all duration-700"
      />
      
      <h1 className="text-5xl font-black mb-4 tracking-tighter">
        BOLT <span className="text-indigo-500">STUDIO</span>
      </h1>
      
      <p className="text-white/40 text-lg max-w-md mb-12 font-medium">
        Your production-ready application is live in the sandbox. Start editing in the center pane to see real-time updates.
      </p>

      <div className="grid grid-cols-3 gap-6 w-full max-w-2xl">
        {[
          { icon: Zap, label: 'Fast Build', color: 'text-yellow-400' },
          { icon: Shield, label: 'Secure', color: 'text-green-400' },
          { icon: Sparkles, label: 'Premium', color: 'text-indigo-400' }
        ].map((item, i) => (
          <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
            <item.icon className={"w-6 h-6 mb-3 mx-auto " + item.color} />
            <p className="text-xs font-bold uppercase tracking-widest text-white/60">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;`
  }
];
