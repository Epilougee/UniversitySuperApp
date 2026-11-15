'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Chalkboard from '@/components/Chalkboard';
import { UserRole } from '@/lib/types';

interface DemoAccount {
  id: string;
  pass: string;
  name: string;
  role: UserRole;
  desc: string;
}

const DEMO_ACCOUNTS: Record<UserRole, DemoAccount> = {
  Student: {
    id: 'E25B022087',
    pass: 'E25B022087',
    name: 'John Doe',
    role: 'Student',
    desc: 'Computer Science (Year 2)',
  },
  Teacher: {
    id: 'T25S022090',
    pass: 'T25S022090',
    name: 'Dr. Indu Kumari',
    role: 'Teacher',
    desc: 'Associate Professor (CSE)',
  },
  Admin: {
    id: 'Admin@404',
    pass: 'Admin@123',
    name: 'System Admin',
    role: 'Admin',
    desc: 'Full Access Administrator',
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('Student');
  const [id, setId] = useState('E25B022087');
  const [password, setPassword] = useState('E25B022087');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoFeedback, setDemoFeedback] = useState<string | null>(null);

  const fillDemo = (targetRole: UserRole) => {
    const account = DEMO_ACCOUNTS[targetRole];
    setRole(targetRole);
    setId(account.id);
    setPassword(account.pass);
    setError(null);
    setDemoFeedback(`✓ Auto-filled ${targetRole} credentials (${account.name})`);
    setTimeout(() => {
      setDemoFeedback(null);
    }, 3000);
  };

  const handleRoleSelect = (newRole: UserRole) => {
    setRole(newRole);
    setError(null);
    const account = DEMO_ACCOUNTS[newRole];
    setId(account.id);
    setPassword(account.pass);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!id.trim() || !password.trim()) {
      setError('Please enter your ID and password to continue.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, id: id.trim(), password: password.trim() }),
      });

      const data = await resp.json();

      if (!data.ok) {
        setError(data.message || 'Invalid credentials. Please check your credentials.');
        setLoading(false);
        return;
      }

      // Store in session storage
      sessionStorage.setItem(
        'Uni_user',
        JSON.stringify({
          role: data.role,
          id: data.user.id,
          name: data.user.name,
          ...data.user,
        })
      );

      const targetPath = role === 'Student' ? '/student' : role === 'Teacher' ? '/teacher' : '/admin';
      router.push(targetPath);
    } catch {
      setError('Cannot connect to server. Please ensure the app is running.');
      setLoading(false);
    }
  };

  const roleLabels: Record<UserRole, string> = {
    Student: 'University ID (URN)',
    Teacher: 'Teacher ID',
    Admin: 'Admin ID',
  };

  return (
    <div style={styles.pageContainer}>
      <Chalkboard />

      <div style={styles.glassCard}>
        <div style={styles.brandHeader}>
          Un<span style={{ color: '#a5b4fc' }}>i</span>
        </div>
        <div style={styles.brandSub}>Student &amp; Staff Portal · 2025–26</div>

        {/* Role selector tabs */}
        <div style={styles.roleContainer}>
          <button
            type="button"
            style={{
              ...styles.roleBtn,
              ...(role === 'Student' ? styles.roleBtnActive : {}),
            }}
            onClick={() => handleRoleSelect('Student')}
          >
            <i className="fa-solid fa-user-graduate" style={{ marginRight: 6 }}></i>
            Student
          </button>
          <button
            type="button"
            style={{
              ...styles.roleBtn,
              ...(role === 'Teacher' ? styles.roleBtnActive : {}),
            }}
            onClick={() => handleRoleSelect('Teacher')}
          >
            <i className="fa-solid fa-chalkboard-user" style={{ marginRight: 6 }}></i>
            Teacher
          </button>
          <button
            type="button"
            style={{
              ...styles.roleBtn,
              ...(role === 'Admin' ? styles.roleBtnActive : {}),
            }}
            onClick={() => handleRoleSelect('Admin')}
          >
            <i className="fa-solid fa-shield-halved" style={{ marginRight: 6 }}></i>
            Admin
          </button>
        </div>

        {/* Demo auto-fill option section */}
        <div style={styles.demoSection}>
          <div style={styles.demoHeader}>
            <span style={styles.demoTitle}>
              <i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: 6, color: '#a5b4fc' }}></i>
              Click to Auto-Fill Demo:
            </span>
            <button
              type="button"
              style={styles.quickFillCurrentBtn}
              onClick={() => fillDemo(role)}
              title={`Fill demo credentials for current role (${role})`}
            >
              <i className="fa-solid fa-bolt" style={{ marginRight: 4 }}></i>
              Fill {role}
            </button>
          </div>

          <div style={styles.demoChipsRow}>
            <button
              type="button"
              style={{
                ...styles.demoChip,
                ...(role === 'Student' ? styles.demoChipSelected : {}),
              }}
              onClick={() => fillDemo('Student')}
            >
              <i className="fa-solid fa-user-graduate" style={{ marginRight: 5 }}></i>
              Demo Student
            </button>
            <button
              type="button"
              style={{
                ...styles.demoChip,
                ...(role === 'Teacher' ? styles.demoChipSelected : {}),
              }}
              onClick={() => fillDemo('Teacher')}
            >
              <i className="fa-solid fa-chalkboard-user" style={{ marginRight: 5 }}></i>
              Demo Teacher
            </button>
            <button
              type="button"
              style={{
                ...styles.demoChip,
                ...(role === 'Admin' ? styles.demoChipSelected : {}),
              }}
              onClick={() => fillDemo('Admin')}
            >
              <i className="fa-solid fa-shield-halved" style={{ marginRight: 5 }}></i>
              Demo Admin
            </button>
          </div>
        </div>

        {demoFeedback && (
          <div style={styles.feedbackBanner}>
            <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }}></i>
            {demoFeedback}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={styles.inputBox}>
            <div style={styles.labelRow}>
              <label style={styles.label}>{roleLabels[role]}</label>
              <button
                type="button"
                style={styles.labelAction}
                onClick={() => fillDemo(role)}
              >
                Auto-fill
              </button>
            </div>
            <div style={styles.inputWrapper}>
              <i className="fa-solid fa-id-card" style={styles.inputIcon}></i>
              <input
                type="text"
                placeholder="Enter your ID"
                value={id}
                onChange={(e) => setId(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          <div style={styles.inputBox}>
            <div style={styles.labelRow}>
              <label style={styles.label}>Password</label>
              <span style={styles.labelHint}>Demo: default ID or Admin@123</span>
            </div>
            <div style={styles.inputWrapper}>
              <i className="fa-solid fa-lock" style={styles.inputIcon}></i>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" style={styles.loginBtn} disabled={loading}>
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
                Signing in...
              </>
            ) : (
              <>
                <i className="fa-solid fa-right-to-bracket" style={{ marginRight: 8 }}></i>
                Secure Login
              </>
            )}
          </button>
        </form>

        {error && (
          <div style={styles.loginErr}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }}></i>
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#05050a',
    position: 'relative',
    overflow: 'hidden',
  },
  glassCard: {
    position: 'relative',
    zIndex: 10,
    width: 460,
    maxWidth: '92vw',
    padding: '38px 34px',
    textAlign: 'center',
    borderRadius: 32,
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(99, 102, 241, 0.25)',
    backdropFilter: 'blur(40px) brightness(1.1)',
    WebkitBackdropFilter: 'blur(40px) brightness(1.1)',
    boxShadow: '0 40px 100px rgba(0, 0, 0, .9), 0 0 60px rgba(99, 102, 241, .08)',
  },
  brandHeader: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: 5,
    marginBottom: 4,
    color: '#fff',
    textTransform: 'uppercase',
  },
  brandSub: {
    fontSize: 10,
    color: 'rgba(165, 180, 252, 0.65)',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 20,
    fontWeight: 600,
  },
  roleContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  roleBtn: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: 'rgba(255, 255, 255, 0.75)',
    padding: '11px 0',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: 12,
    transition: 'all 0.25s',
  },
  roleBtnActive: {
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    color: '#fff',
    borderColor: 'rgba(99, 102, 241, 0.5)',
    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
  },
  demoSection: {
    marginBottom: 18,
    padding: '10px 12px',
    borderRadius: 14,
    background: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    textAlign: 'left',
  },
  demoHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: '#c7d2fe',
    letterSpacing: 0.5,
    display: 'flex',
    alignItems: 'center',
  },
  quickFillCurrentBtn: {
    background: 'rgba(99, 102, 241, 0.2)',
    border: '1px solid rgba(99, 102, 241, 0.4)',
    color: '#e0e7ff',
    padding: '3px 8px',
    borderRadius: 8,
    fontSize: 10.5,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  demoChipsRow: {
    display: 'flex',
    gap: 6,
    justifyContent: 'space-between',
  },
  demoChip: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: 'rgba(255, 255, 255, 0.75)',
    padding: '7px 4px',
    borderRadius: 9,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  demoChipSelected: {
    background: 'rgba(99, 102, 241, 0.3)',
    borderColor: '#818cf8',
    color: '#ffffff',
    boxShadow: '0 2px 10px rgba(99, 102, 241, 0.25)',
  },
  feedbackBanner: {
    marginBottom: 14,
    fontSize: 11.5,
    color: '#86efac',
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    padding: '7px 12px',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBox: {
    textAlign: 'left',
    marginBottom: 16,
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    color: 'rgba(165, 180, 252, 0.75)',
    fontWeight: 700,
    marginLeft: 4,
  },
  labelAction: {
    background: 'none',
    border: 'none',
    color: '#818cf8',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
  },
  labelHint: {
    fontSize: 9.5,
    color: 'rgba(255, 255, 255, 0.35)',
  },
  inputWrapper: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 14,
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '13px 16px 13px 44px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    color: 'white',
    outline: 'none',
    boxSizing: 'border-box',
    fontSize: 13.5,
    transition: 'border-color 0.25s, box-shadow 0.25s',
  },
  loginBtn: {
    width: '100%',
    padding: 15,
    marginTop: 6,
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    border: '1px solid rgba(99, 102, 241, 0.4)',
    borderRadius: 12,
    color: 'white',
    fontWeight: 800,
    fontSize: 13.5,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    transition: 'all 0.25s',
    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
  },
  loginErr: {
    marginTop: 12,
    fontSize: 11.5,
    color: '#fc8181',
    letterSpacing: 0.3,
    padding: '9px 12px',
    background: 'rgba(252, 129, 129, 0.08)',
    border: '1px solid rgba(252, 129, 129, 0.2)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
