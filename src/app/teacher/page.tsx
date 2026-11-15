'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherPortalPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    try {
      const userStr = sessionStorage.getItem('Uni_user');
      if (!userStr) {
        router.replace('/');
        return;
      }
      const user = JSON.parse(userStr);
      if (user.role !== 'Teacher') {
        router.replace('/');
        return;
      }
      setAuthorized(true);
    } catch {
      router.replace('/');
    }
  }, [router]);

  if (!authorized) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading Faculty Portal...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <iframe
        src="/portals/teacher.html"
        style={styles.iframe}
        title="Uni Faculty Portal"
        allow="geolocation; camera; microphone"
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    margin: 0,
    padding: 0,
    background: '#020408',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block',
  },
  loadingContainer: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#020408',
    color: '#fff',
    fontFamily: 'Inter, sans-serif',
  },
  spinner: {
    width: 44,
    height: 44,
    border: '3px solid rgba(99, 102, 241, 0.2)',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    marginTop: 18,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1.5,
  },
};
