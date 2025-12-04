import { motion } from 'framer-motion'
import Layout from './Layout'
import SkeletonLoader from './SkeletonLoader'

interface DashboardSkeletonProps {
  currentProfile?: 'clinica' | 'profissional' | 'recepcionista' | 'medico'
}

export default function DashboardSkeleton({ currentProfile = 'clinica' }: DashboardSkeletonProps) {
  return (
    <Layout currentProfile={currentProfile}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="dashboard-skeleton-container"
      >
        {/* Header Skeleton */}
        <div className="skeleton-header">
          <SkeletonLoader width="200px" height="32px" borderRadius="0.5rem" />
          <SkeletonLoader width="150px" height="20px" borderRadius="0.5rem" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="skeleton-stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="skeleton-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <div className="skeleton-card-header">
                <SkeletonLoader variant="circular" width="48px" height="48px" />
                <div className="skeleton-card-content">
                  <SkeletonLoader width="80px" height="16px" borderRadius="0.25rem" />
                  <SkeletonLoader width="120px" height="24px" borderRadius="0.5rem" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="skeleton-main-content">
          <motion.div
            className="skeleton-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <div className="skeleton-section-header">
              <SkeletonLoader width="180px" height="24px" borderRadius="0.5rem" />
              <SkeletonLoader width="100px" height="36px" borderRadius="0.5rem" />
            </div>
            
            <div className="skeleton-list">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  className="skeleton-list-item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
                >
                  <SkeletonLoader variant="circular" width="40px" height="40px" />
                  <div className="skeleton-item-content">
                    <SkeletonLoader width="60%" height="18px" borderRadius="0.25rem" />
                    <SkeletonLoader width="40%" height="14px" borderRadius="0.25rem" />
                  </div>
                  <SkeletonLoader width="80px" height="32px" borderRadius="0.5rem" />
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="skeleton-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <div className="skeleton-section-header">
              <SkeletonLoader width="150px" height="24px" borderRadius="0.5rem" />
            </div>
            
            <div className="skeleton-grid">
              {[1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="skeleton-grid-item"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.05, duration: 0.3 }}
                >
                  <SkeletonLoader width="100%" height="120px" borderRadius="0.75rem" />
                  <div className="skeleton-grid-content">
                    <SkeletonLoader width="70%" height="18px" borderRadius="0.25rem" />
                    <SkeletonLoader width="50%" height="14px" borderRadius="0.25rem" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

      <style>{`
        .dashboard-skeleton-container {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          animation: fadeIn 0.5s ease-out;
        }

        .skeleton-header {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .skeleton-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .skeleton-card {
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-xl);
          padding: 1.5rem;
          box-shadow: var(--shadow-lg);
          position: relative;
          overflow: hidden;
          transition: var(--transition-base);
        }

        .skeleton-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(139, 92, 246, 0.1),
            transparent
          );
          animation: shimmer-sweep 2s infinite;
        }

        @keyframes shimmer-sweep {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }

        .skeleton-card-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .skeleton-card-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }

        .skeleton-main-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .skeleton-section {
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-xl);
          padding: 1.5rem;
          box-shadow: var(--shadow-lg);
          position: relative;
          overflow: hidden;
        }

        .skeleton-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent);
        }

        .skeleton-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .skeleton-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .skeleton-list-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(15, 23, 42, 0.5);
          border-radius: var(--radius-lg);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: var(--transition-base);
        }

        .skeleton-list-item:hover {
          background: rgba(15, 23, 42, 0.6);
          border-color: rgba(139, 92, 246, 0.2);
        }

        .skeleton-item-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .skeleton-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .skeleton-grid-item {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .skeleton-grid-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
      `}</style>
    </Layout>
  )
}

