import { S } from './store.js';


let sess = null;

export const getSession = () => sess;
export function setSession(s) { sess = s; }
export function clearSession() { sess = null; }
export const isAdmin = () => !!sess && sess.role === 'admin';
export const me = () => (sess && sess.role === 'anggota' ? S.students.find(s => s.id === sess.studentId) || null : null);
export const sessionValid = () => !!sess && !!sess.classId && (sess.role === 'admin' || !!me());
export const userName = () => (isAdmin() ? 'Admin' : me() ? me().name : '');
export const userKey = () => (!sess ? 'guest' : sess.role === 'admin' ? 'admin' : 's:' + sess.studentId);
