import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  User, 
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { UserProfile } from '@/types'
import ThemeToggle from './ThemeToggle'

interface LayoutProps {
  children: React.ReactNode
  currentProfile: UserProfile
}

export default function Layout({ children, currentProfile }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { logout, userProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const getMenuItems = () => {
    const baseItems = [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: Calendar, label: 'Consultas', path: '/dashboard/consultas' },
      { icon: User, label: 'Perfil', path: '/dashboard/perfil' },
    ]

    switch (currentProfile) {
      case 'clinica':
        return [
          ...baseItems,
          { icon: Users, label: 'Funcionários', path: '/dashboard/funcionarios' },
        ]
      case 'recepcionista':
        return [
          ...baseItems,
          { icon: FileText, label: 'Prontuários', path: '/dashboard/prontuarios' },
        ]
      case 'medico':
      case 'profissional':
        return [
          ...baseItems,
          { icon: FileText, label: 'Prontuários', path: '/dashboard/prontuarios' },
        ]
      default:
        return baseItems
    }
  }

  const menuItems = getMenuItems()

  const handleNavigate = (path: string) => {
    navigate(path)
  }

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25 }}
            className="sidebar"
          >
            <div className="sidebar-header">
              <h2>Medify</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ThemeToggle />
                <button onClick={() => setSidebarOpen(false)} className="close-btn">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <nav className="sidebar-nav">
              {menuItems.map((item) => (
                <motion.button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </motion.button>
              ))}
            </nav>

            <div className="sidebar-footer">
              <div className="user-info">
                <div className="user-avatar">
                  {userProfile?.fotoURL || (userProfile as any)?.foto ? (
                    <img 
                      key={userProfile?.fotoURL || (userProfile as any)?.foto || 'avatar'}
                      src={userProfile.fotoURL || (userProfile as any).foto} 
                      alt={userProfile?.nome || 'Usuário'}
                      onError={(e) => {
                        // Fallback para inicial se imagem falhar
                        const target = e.target as HTMLImageElement
                        if (target && target.parentElement) {
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent && !parent.textContent) {
                            const initial = userProfile?.nome?.charAt(0).toUpperCase() || 'U'
                            parent.textContent = initial
                          }
                        }
                      }}
                    />
                  ) : (
                    <span>{userProfile?.nome?.charAt(0).toUpperCase() || 'U'}</span>
                  )}
                </div>
                <div className="user-details">
                  <p className="user-name">{userProfile?.nome || 'Usuário'}</p>
                  <p className="user-role">{userProfile?.perfil || 'Perfil'}</p>
                </div>
              </div>
              <motion.button
                onClick={handleLogout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="logout-btn"
              >
                <LogOut size={18} />
                <span>Sair</span>
              </motion.button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="main-content">
        {!sidebarOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSidebarOpen(true)}
            className="menu-toggle"
          >
            <Menu size={24} />
          </motion.button>
        )}
        <div className="content-wrapper">{children}</div>
      </div>

      <style>{`
        .layout-container {
          display: flex;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
        }

        .sidebar {
          width: 280px;
          height: 100vh;
          background: var(--color-surface);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 10;
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.1);
        }

        .sidebar-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sidebar-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--color-primary-medico), var(--color-secondary-medico));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 0.25rem;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: var(--color-surface-elevated);
          color: var(--color-text);
        }

        .sidebar-nav {
          flex: 1;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          overflow-y: auto;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: transparent;
          border: none;
          border-radius: var(--radius-lg);
          color: var(--color-text-muted);
          text-decoration: none;
          transition: var(--transition-base);
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        .nav-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%) scaleY(0);
          width: 3px;
          height: 0;
          background: linear-gradient(180deg, var(--color-primary-medico), var(--color-secondary-medico));
          border-radius: 0 4px 4px 0;
          transition: var(--transition-base);
        }

        .nav-item:hover {
          background: rgba(139, 92, 246, 0.08);
          color: var(--color-text);
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
        }

        .nav-item.active {
          background: linear-gradient(90deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.05));
          color: var(--color-primary-medico);
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
        }

        .nav-item.active::before {
          transform: translateY(-50%) scaleY(1);
          height: 60%;
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-primary-medico), var(--color-secondary-medico));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
          transition: var(--transition-base);
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        .user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .user-avatar::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transform: rotate(45deg);
          transition: var(--transition-slow);
        }

        .user-avatar:hover {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6);
        }

        .user-avatar:hover::before {
          animation: shimmer 1s infinite;
        }

        .user-details {
          flex: 1;
        }

        .user-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0;
        }

        .user-role {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin: 0;
          text-transform: capitalize;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: var(--radius-lg);
          color: var(--color-error);
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: var(--transition-base);
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        .logout-btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.2);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .logout-btn:hover::before {
          width: 300px;
          height: 300px;
        }

        .logout-btn:active {
          transform: translateY(0);
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--color-background);
        }

        .menu-toggle {
          position: absolute;
          top: 1rem;
          left: 1rem;
          z-index: 20;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          padding: 0.5rem;
          color: var(--color-text);
          cursor: pointer;
          transition: all 0.2s;
        }

        .menu-toggle:hover {
          background: var(--color-surface-elevated);
        }

        .content-wrapper {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          position: relative;
        }

        .content-wrapper::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent);
          opacity: 0;
          transition: var(--transition-base);
        }

        .content-wrapper:hover::before {
          opacity: 1;
        }

        .theme-toggle {
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 0.5rem;
          color: var(--color-text);
          cursor: pointer;
          transition: var(--transition-base);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .theme-toggle:hover {
          background: var(--color-surface);
          border-color: var(--color-primary-medico);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }
      `}</style>
    </div>
  )
}
