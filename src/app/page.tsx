'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Chalkboard from '@/components/Chalkboard';
import { UserRole } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('Student');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleSelect = (newRole: UserRole) => {
    setRole(newRole);
    setError(null);
    setId('');
    setPassword('');
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

        <form onSubmit={handleLogin}>
          <div style={styles.inputBox}>
            <div style={styles.labelRow}>
              <label style={styles.label}>{roleLabels[role]}</label>
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
                autoComplete="username"
              />
            </div>
          </div>

          <div style={styles.inputBox}>
            <div style={styles.labelRow}>
              <label style={styles.label}>Password</label>
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
                autoComplete="current-password"
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
    marginBottom: 20,
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
