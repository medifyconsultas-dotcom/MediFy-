import { motion } from 'framer-motion'
import { Stethoscope } from 'lucide-react'

export default function LoadingScreen() {
  return (
    <div className="loading-screen-apple">
      {/* Background blur layers */}
      <div className="blur-layer blur-layer-1"></div>
      <div className="blur-layer blur-layer-2"></div>
      <div className="blur-layer blur-layer-3"></div>
      
      {/* Main content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="loading-content-apple"
      >
        {/* Logo/Icon */}
        <motion.div
          className="loading-logo-container"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="loading-logo-wrapper">
            <Stethoscope size={48} className="loading-logo-icon" />
            <motion.div
              className="logo-glow"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="loading-title-apple"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          Medify
        </motion.h1>

        {/* Apple-style spinner */}
        <div className="apple-spinner-container">
          <motion.div
            className="apple-spinner"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'linear'
            }}
          >
            <svg className="spinner-svg" viewBox="0 0 50 50">
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
              <circle
                className="spinner-circle"
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="31.416"
                strokeDashoffset="31.416"
              />
            </svg>
          </motion.div>
          
          {/* Inner glow */}
          <motion.div
            className="spinner-glow"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        </div>
      </motion.div>
      
      <style>{`
        .loading-screen-apple {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f172a;
          position: relative;
          overflow: hidden;
        }

        .blur-layer {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.6;
          animation: float 8s ease-in-out infinite;
        }

        .blur-layer-1 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.4), transparent 70%);
          top: -100px;
          left: -100px;
          animation-delay: 0s;
        }

        .blur-layer-2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(167, 139, 250, 0.3), transparent 70%);
          bottom: -150px;
          right: -150px;
          animation-delay: 2s;
        }

        .blur-layer-3 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.25), transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: 4s;
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -30px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .loading-content-apple {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2.5rem;
          position: relative;
          z-index: 10;
        }

        .apple-spinner-container {
          position: relative;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .apple-spinner {
          width: 60px;
          height: 60px;
          position: relative;
        }

        .spinner-svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .spinner-circle {
          transform: rotate(-90deg);
          transform-origin: 50% 50%;
          animation: spinner-dash 1.5s ease-in-out infinite;
        }

        @keyframes spinner-dash {
          0% {
            stroke-dashoffset: 31.416;
          }
          50% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: 31.416;
          }
        }

        .spinner-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent 70%);
          pointer-events: none;
        }

        .loading-logo-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-logo-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-logo-icon {
          color: #8b5cf6;
          filter: drop-shadow(0 0 20px rgba(139, 92, 246, 0.6));
          position: relative;
          z-index: 2;
        }

        .logo-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.4), transparent 70%);
          pointer-events: none;
          z-index: 1;
        }

        .loading-title-apple {
          font-size: 2.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #8b5cf6, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
          letter-spacing: -0.5px;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
        }

        .progress-dots {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          justify-content: center;
        }

        .progress-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #8b5cf6;
          box-shadow: 0 0 12px rgba(139, 92, 246, 0.6);
        }
      `}</style>
    </div>
  )
}
